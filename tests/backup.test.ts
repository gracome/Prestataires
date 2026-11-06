import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { open, seal, serialize, deserialize } from "@/lib/backup/archive";
import { modelNames, restoreOrder } from "@/lib/backup/export";
import type { Archive } from "@/lib/backup/export";

/**
 * The backup, tested the only way a backup can be: by reading it back.
 *
 * Everything here is the round trip. A copy that writes without error and
 * cannot be opened, or opens with a Decimal turned into a string, is worse
 * than no copy at all — it is a copy somebody is counting on.
 */

const PASSPHRASE = "une phrase secrète assez longue pour compter";

const ARCHIVE: Archive = {
  version: 1,
  takenAt: "2026-11-06T02:00:00.000Z",
  migration: "20261022000000_session_idle",
  tables: {
    Provider: [
      {
        id: "cmv1",
        businessName: "Belle Mains",
        createdAt: new Date("2026-09-01T08:30:00.000Z"),
        deposit: new Prisma.Decimal("12500.75"),
        counter: 9007199254740993n,
        logo: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
        settings: { theme: { primary: "#B0797A" }, tags: ["onglerie", null] },
        archived: null,
      },
    ],
    Appointment: [],
  },
  counts: { Provider: 1, Appointment: 0 },
};

describe("la sérialisation", () => {
  it("rend chaque type tel qu'il a été pris", () => {
    const back = deserialize(serialize(ARCHIVE));
    const row = back.tables.Provider[0] as Record<string, unknown>;

    expect(row.createdAt).toBeInstanceOf(Date);
    expect((row.createdAt as Date).toISOString()).toBe("2026-09-01T08:30:00.000Z");

    expect(Prisma.Decimal.isDecimal(row.deposit)).toBe(true);
    expect((row.deposit as Prisma.Decimal).toString()).toBe("12500.75");

    expect(typeof row.counter).toBe("bigint");
    expect(row.counter).toBe(9007199254740993n);

    expect(Buffer.isBuffer(row.logo)).toBe(true);
    expect([...(row.logo as Buffer)]).toEqual([0x89, 0x50, 0x4e, 0x47]);

    expect(row.settings).toEqual({
      theme: { primary: "#B0797A" },
      tags: ["onglerie", null],
    });
    expect(row.archived).toBeNull();
  });

  it("garde un entier que JSON ne saurait pas porter", () => {
    // 9007199254740993 is Number.MAX_SAFE_INTEGER + 2: as a JSON number it
    // comes back as ...992, silently, which is how an id stops matching.
    const row = deserialize(serialize(ARCHIVE)).tables.Provider[0] as Record<
      string,
      unknown
    >;
    expect((row.counter as bigint).toString()).toBe("9007199254740993");
  });
});

describe("le chiffrement", () => {
  it("se relit avec la bonne phrase", () => {
    const back = open(seal(ARCHIVE, PASSPHRASE), PASSPHRASE);
    expect(back.takenAt).toBe(ARCHIVE.takenAt);
    expect(back.migration).toBe(ARCHIVE.migration);
    expect(back.counts).toEqual(ARCHIVE.counts);
  });

  it("ne laisse rien lire en clair dans le fichier", () => {
    const file = seal(ARCHIVE, PASSPHRASE);
    expect(file.toString("latin1")).not.toContain("Belle Mains");
  });

  it("refuse une phrase fausse plutôt que de rendre n'importe quoi", () => {
    const file = seal(ARCHIVE, PASSPHRASE);
    expect(() => open(file, "une autre phrase bien assez longue")).toThrow(
      /phrase secrète incorrecte/i,
    );
  });

  it("refuse un fichier modifié", () => {
    const file = seal(ARCHIVE, PASSPHRASE);
    file[file.length - 1] ^= 0xff;
    expect(() => open(file, PASSPHRASE)).toThrow(/abîmé|incorrecte/i);
  });

  it("refuse un fichier qui n'en est pas un", () => {
    expect(() => open(Buffer.alloc(200), PASSPHRASE)).toThrow(
      /n'est pas une sauvegarde/i,
    );
  });

  it("refuse une phrase trop courte au moment d'écrire", () => {
    expect(() => seal(ARCHIVE, "trop court")).toThrow(/16 caractères/);
  });
});

describe("l'ordre de restauration", () => {
  it("couvre chaque modèle du schéma, une fois", () => {
    const { ordered, cyclic } = restoreOrder();
    const all = [...ordered, ...cyclic].sort();
    expect(all).toEqual([...modelNames()].sort());
    expect(new Set(all).size).toBe(all.length);
  });

  it("place chaque modèle après ceux dont il porte la clé", () => {
    const { ordered, cyclic } = restoreOrder();
    // A cycle cannot be ordered; the restore handles those separately, and
    // this test exists to notice the day the schema grows one.
    expect(cyclic).toEqual([]);

    const rank = new Map(ordered.map((name, at) => [name, at]));

    for (const model of Prisma.dmmf.datamodel.models) {
      for (const field of model.fields) {
        if (
          field.kind === "object" &&
          (field.relationFromFields?.length ?? 0) > 0 &&
          field.type !== model.name &&
          rank.has(field.type)
        ) {
          expect(
            rank.get(field.type)!,
            `${model.name} doit venir après ${field.type}`,
          ).toBeLessThan(rank.get(model.name)!);
        }
      }
    }
  });
});

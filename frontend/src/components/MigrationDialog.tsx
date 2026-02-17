import { useState, useEffect } from "react";
import { isTauri } from "../utils/platform";

interface MigrationDialogProps {
  onMigrate: (data: Uint8Array) => Promise<void>;
  onSkip: () => void;
}

export default function MigrationDialog({ onMigrate, onSkip }: MigrationDialogProps) {
  const [migrating, setMigrating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [legacyData, setLegacyData] = useState<Uint8Array | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isTauri()) return;

    (async () => {
      try {
        const { detectLegacyDatabase } = await import("../db/legacyMigration");
        const data = await detectLegacyDatabase();
        if (data) {
          setLegacyData(data);
          setShow(true);
        }
      } catch {
        // Silently fail — migration is optional
      }
    })();
  }, []);

  if (!show || !legacyData) return null;

  async function handleMigrate() {
    if (!legacyData) return;
    setMigrating(true);
    setError(null);
    try {
      await onMigrate(legacyData);
      const { markMigrationComplete } = await import("../db/legacyMigration");
      await markMigrationComplete();
      setShow(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Migration failed");
      setMigrating(false);
    }
  }

  function handleSkip() {
    setShow(false);
    onSkip();
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          background: "var(--color-surface, #fff)",
          borderRadius: 12,
          padding: "2rem",
          maxWidth: 420,
          width: "90%",
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
          color: "var(--color-text, #333)",
        }}
      >
        <h2 style={{ marginBottom: "1rem", fontSize: "1.25rem" }}>Previous Data Found</h2>
        <p style={{ marginBottom: "1.5rem", lineHeight: 1.6 }}>
          A database from a previous BareTrack installation was detected.
          Would you like to import your existing sessions, equipment profiles,
          and settings?
        </p>
        {error && <p style={{ color: "#c62828", marginBottom: "1rem" }}>{error}</p>}
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
          <button
            onClick={handleSkip}
            disabled={migrating}
            style={{
              padding: "0.6rem 1.25rem",
              border: "1px solid var(--color-border, #ccc)",
              borderRadius: 6,
              background: "transparent",
              cursor: "pointer",
              color: "var(--color-text, #333)",
            }}
          >
            Start Fresh
          </button>
          <button
            onClick={handleMigrate}
            disabled={migrating}
            style={{
              padding: "0.6rem 1.25rem",
              border: "none",
              borderRadius: 6,
              background: "var(--color-primary, #1a73e8)",
              color: "#fff",
              fontWeight: 500,
              cursor: migrating ? "wait" : "pointer",
              opacity: migrating ? 0.7 : 1,
            }}
          >
            {migrating ? "Importing…" : "Import Data"}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";
import { useState, useEffect } from "react";
import { useRef } from "react";
import Link from "next/link";
import NextImage from "next/image";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { ArrowUp, ArrowUpRight, Check, Flag, Loader2 } from "lucide-react";
import {
  categories,
  outcome,
  sourceTypes,
  type Nominee,
  type NomineeImage,
  type NomineeSource,
} from "@/lib/constants";
export async function api(path: string, body: unknown) {
  const res = await fetch("/api/" + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Please try again.");
  return data;
}

export function NomineeBadges({ nominee }: { nominee: Nominee }) {
  return (
    <span className="nominee-badges">
      {nominee.verified && (
        <span className="verified-badge">
          <Check size={11} /> Receipts verified
        </span>
      )}
      <span className={`outcome-badge outcome-${nominee.outcome}`}>
        {outcome(nominee.outcome).name}
      </span>
    </span>
  );
}
let voterSession: Promise<unknown> | undefined;
async function ensureVoterSession() {
  if (!voterSession)
    voterSession = api("session", {}).catch((e) => {
      voterSession = undefined;
      throw e;
    });
  await voterSession;
}
export function Vote({
  nominee,
  closed = false,
}: {
  nominee: Nominee;
  closed?: boolean;
}) {
  const [state, setState] = useState({
    count: nominee.count,
    voted: nominee.voted,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(
    () => setState({ count: nominee.count, voted: nominee.voted }),
    [nominee.count, nominee.voted],
  );
  return (
    <div className="vote-wrap">
      <button
        className={"vote " + (state.voted ? "voted" : "")}
        aria-label={`${state.voted ? "Remove your vote for" : "Vote for"} ${nominee.company}`}
        aria-pressed={state.voted}
        disabled={busy || closed}
        onClick={async () => {
          const prev = state;
          setBusy(true);
          setError("");
          setState({
            count: state.count + (state.voted ? -1 : 1),
            voted: !state.voted,
          });
          try {
            await ensureVoterSession();
            setState(
              await api(`nominees/${nominee.id}/vote`, { active: !prev.voted }),
            );
          } catch (e) {
            setState(prev);
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <ArrowUp size={17} />
        <span>{state.count.toLocaleString()}</span>
        <small>{state.voted ? "VOTED" : "VOTE"}</small>
      </button>
      {error && (
        <span role="alert" className="vote-error">
          {error}
        </span>
      )}
    </div>
  );
}

function ImageElement({
  image,
  className,
  onError,
}: {
  image: NomineeImage;
  className?: string;
  onError?: () => void;
}) {
  const imageClassName = [
    className,
    image.fit === "contain" ? "image-contain" : "",
  ]
    .filter(Boolean)
    .join(" ");
  let ownedBlob = false;
  try {
    ownedBlob =
      image.kind === "upload" &&
      new URL(image.url).hostname.endsWith(".public.blob.vercel-storage.com") &&
      new URL(image.url).pathname.startsWith("/nominations/");
  } catch {
    ownedBlob = false;
  }
  if (ownedBlob)
    return (
      <NextImage
        src={image.url}
        alt={image.alt}
        className={imageClassName || undefined}
        fill
        sizes="(max-width: 700px) 68px, 112px"
      />
    );
  return (
    <img
      src={image.url}
      alt={image.alt}
      className={imageClassName || undefined}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={onError}
    />
  );
}

export function ImageGallery({
  images,
  title,
}: {
  images: NomineeImage[];
  title: string;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (selected === null) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
      if (event.key === "ArrowLeft")
        setSelected((current) =>
          current === null ? null : (current + images.length - 1) % images.length,
        );
      if (event.key === "ArrowRight")
        setSelected((current) =>
          current === null ? null : (current + 1) % images.length,
        );
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [selected, images.length]);
  if (!images.length) return null;
  return (
    <>
      <div className="image-gallery" aria-label={`${title} images`}>
        {images.map((image, index) => (
          <button
            className="image-thumb"
            key={image.url}
            type="button"
            aria-label={`View image ${index + 1}: ${image.alt}`}
            onClick={() => setSelected(index)}
          >
            <ImageElement image={image} />
          </button>
        ))}
      </div>
      {selected !== null && (
        <div
          className="image-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`${title} image viewer`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelected(null);
          }}
        >
          <button
            className="lightbox-close"
            type="button"
            ref={closeRef}
            onClick={() => setSelected(null)}
          >
            Close
          </button>
          <button
            className="lightbox-nav lightbox-prev"
            type="button"
            aria-label="Previous image"
            onClick={() =>
              setSelected((selected + images.length - 1) % images.length)
            }
          >
            ←
          </button>
          <figure>
            <img
              src={images[selected].url}
              alt={images[selected].alt}
              referrerPolicy="no-referrer"
            />
            <figcaption>{images[selected].alt}</figcaption>
          </figure>
          <button
            className="lightbox-nav lightbox-next"
            type="button"
            aria-label="Next image"
            onClick={() => setSelected((selected + 1) % images.length)}
          >
            →
          </button>
        </div>
      )}
    </>
  );
}
export function NomineeList({
  items,
  closed,
}: {
  items: Nominee[];
  closed: boolean;
}) {
  const [sort, setSort] = useState("top");
  const sortItems = (rows: Nominee[]) =>
    [...rows].sort((a, b) =>
      sort === "new"
        ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        : b.count - a.count ||
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

  const sections = categories
    .map((item) => ({
      ...item,
      items: sortItems(items.filter((nominee) => nominee.category === item.id)),
    }))
    .filter((item) => item.items.length);

  return (
    <>
      <div className="list-meta">
        <span>
          {items.length} NOMINATION{items.length === 1 ? "" : "S"}
        </span>
        <label>
          Sort within categories{" "}
          <select
            aria-label="Sort nominees"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="top">Most votes</option>
            <option value="new">Newest</option>
          </select>
        </label>
      </div>
      {sections.length ? (
        <div className="category-sections">
          {sections.map((section) => (
            <section
              className="category-section"
              key={section.id}
              aria-labelledby={`category-${section.id}`}
            >
              <div className="category-section-heading">
                <h3 id={`category-${section.id}`}>{section.name}</h3>
                <span>
                  {section.items.length} nomination
                  {section.items.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="nominee-list">
                {section.items.map((n, i) => (
                  <article className="nominee" key={n.id}>
                    <span className="rank">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {n.images?.[0] && (
                      <Link
                        className="nominee-cover"
                        href={`/nominees/${n.id}`}
                        aria-label={`View images for ${n.company}`}
                      >
                        <ImageElement image={n.images[0]} />
                      </Link>
                    )}
                    <div className="nominee-copy">
                      <div className="nominee-overline">
                        <span>{n.company}</span>
                      </div>
                      <Link className="nominee-title" href={"/nominees/" + n.id}>
                        {n.headline}
                        <ArrowUpRight size={19} />
                      </Link>
                      <p>{n.description}</p>
                      <NomineeBadges nominee={n} />
                    </div>
                    <Vote nominee={n} closed={closed} />
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="empty">
          <h3>No nominations yet.</h3>
          <p>Know something that got worse this year?</p>
          <Link className="button" href="/submit">
            Submit a nomination <ArrowUpRight size={16} />
          </Link>
        </div>
      )}
    </>
  );
}
type DraftImage = {
  id: number;
  kind: "upload" | "external";
  file?: File;
  url: string;
  alt: string;
  preview?: string;
  uploadedUrl?: string;
};
type DraftSource = NomineeSource & { id: string };
let nextImageId = 1;

export function SubmissionForm({
  closed,
  seasonId,
}: {
  closed: boolean;
  seasonId: number;
}) {
  const router = useRouter();
  const [company, setCompany] = useState("");
  const [similar, setSimilar] = useState<
    { id: string; company: string; headline: string }[]
  >([]);
  const [images, setImages] = useState<DraftImage[]>([]);
  const [sources, setSources] = useState<DraftSource[]>([
    {
      id: "initial",
      url: "",
      title: "",
      publisher: "",
      publishedAt: "",
      type: "reporting",
    },
  ]);
  const [busy, setBusy] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch("/api/similar?q=" + encodeURIComponent(company), {
        signal: controller.signal,
      })
        .then((r) => r.json())
        .then(setSimilar)
        .catch(() => {});
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [company]);
  if (closed)
    return (
      <div className="empty">
        <h2>The ballot is closed.</h2>
        <Link href="/results">See the results →</Link>
      </div>
    );
  function addImage(kind: DraftImage["kind"]) {
    if (images.length >= 3) {
      setError("You can add up to three images.");
      return;
    }
    setImages((current) => [
      ...current,
      { id: nextImageId++, kind, url: "", alt: "" },
    ]);
    setError("");
  }
  function updateImage(id: number, update: Partial<DraftImage>) {
    setImages((current) =>
      current.map((image) => (image.id === id ? { ...image, ...update } : image)),
    );
  }
  function updateSource(id: string, update: Partial<DraftSource>) {
    setSources((current) =>
      current.map((source) =>
        source.id === id ? { ...source, ...update } : source,
      ),
    );
  }
  const today = new Date().toISOString().slice(0, 10);
  const maxChangeDate =
    today < `${seasonId}-12-31` ? today : `${seasonId}-12-31`;
  return (
    <form
      className="form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        setUploadStatus("");
        const data = new FormData(e.currentTarget);
        try {
          const prepared: NomineeImage[] = [];
          for (const image of images) {
            const alt = image.alt.trim();
            if (alt.length < 5 || alt.length > 300)
              throw new Error("Each image needs a description between 5 and 300 characters.");
            if (image.kind === "external") {
              const url = image.url.trim();
              if (!/^https:\/\//i.test(url))
                throw new Error("Image URLs must use HTTPS.");
              prepared.push({ kind: image.kind, url, alt });
              continue;
            }
            if (!image.file && !image.uploadedUrl)
              throw new Error("Choose a file for each upload image.");
            let url = image.uploadedUrl;
            if (!url && image.file) {
              setUploadStatus(`Uploading image ${prepared.length + 1} of ${images.length}…`);
              const extension = image.file.type === "image/jpeg" ? "jpg" : image.file.type.split("/")[1];
              const blob = await upload(
                `nominations/${crypto.randomUUID()}.${extension}`,
                image.file,
                {
                  access: "public",
                  contentType: image.file.type,
                  handleUploadUrl: "/api/uploads",
                  onUploadProgress: ({ percentage }) =>
                    setUploadStatus(`Uploading image ${prepared.length + 1} of ${images.length} (${Math.round(percentage)}%)…`),
                },
              );
              url = blob.url;
              updateImage(image.id, { uploadedUrl: url });
            }
            prepared.push({ kind: "upload", url: url!, alt });
          }
          const result = await api("nominees", {
            company,
            headline: data.get("headline"),
            description: data.get("description"),
            before: data.get("before"),
            after: data.get("after"),
            impact: data.get("impact"),
            changedAt: data.get("changedAt"),
            category: data.get("category"),
            sector: data.get("category"),
            sources: sources.map(({ id: _id, ...source }) => source),
            images: prepared,
            website: data.get("website"),
          });
          router.push("/nominees/" + result.id);
          router.refresh();
        } catch (e) {
          setError((e as Error).message);
          setBusy(false);
          setUploadStatus("");
        }
      }}
    >
      <label>
        Company or product
        <input
          required
          minLength={2}
          maxLength={100}
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Company or product name"
        />
      </label>
      {similar.length > 0 && (
        <aside className="similar">
          <strong>Already on the ballot?</strong>
          {similar.map((n) => (
            <Link key={n.id} href={"/nominees/" + n.id}>
              {n.company}: {n.headline} ↗
            </Link>
          ))}
        </aside>
      )}
      <label>
        Nomination headline
        <input
          name="headline"
          required
          minLength={8}
          maxLength={140}
          placeholder="Describe the change"
        />
      </label>
      <label>
        Category
        <select name="category" required>
          <option value="">Choose a category</option>
          {categories.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        When did the change happen?
        <input
          name="changedAt"
          type="date"
          min={`${seasonId}-01-01`}
          max={maxChangeDate}
          required
        />
        <small>
          The change must have started or materially expanded during the {seasonId}{" "}
          award year.
        </small>
      </label>
      <label>
        Short ballot summary
        <textarea
          name="description"
          required
          minLength={30}
          maxLength={1000}
          rows={4}
          placeholder="Summarize the downgrade in a few factual sentences."
        />
      </label>
      <label>
        Before
        <textarea
          name="before"
          required
          minLength={20}
          maxLength={1500}
          rows={4}
          placeholder="What did customers or the public get before this year's change?"
        />
      </label>
      <label>
        After
        <textarea
          name="after"
          required
          minLength={20}
          maxLength={1500}
          rows={4}
          placeholder="What changed during this award year?"
        />
      </label>
      <label>
        Damage
        <textarea
          name="impact"
          required
          minLength={20}
          maxLength={1500}
          rows={4}
          placeholder="Who pays, loses access, wastes time, sees more ads, or gets less value?"
        />
      </label>
      <fieldset className="source-form">
        <legend>
          Bring the receipts <span>(1–3)</span>
        </legend>
        <p className="muted">
          Link the announcement, public record, or reporting that dates the
          change. Older links may establish the “before,” but not eligibility.
        </p>
        {sources.map((source, index) => (
          <div className="source-entry" key={source.id}>
            <div className="image-entry-head">
              <strong>Receipt {index + 1}</strong>
              {sources.length > 1 && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() =>
                    setSources((current) =>
                      current.filter((item) => item.id !== source.id),
                    )
                  }
                >
                  Remove
                </button>
              )}
            </div>
            <label>
              Link title
              <input
                required
                minLength={4}
                maxLength={200}
                value={source.title}
                onChange={(event) =>
                  updateSource(source.id, { title: event.target.value })
                }
                placeholder="Headline or document title"
              />
            </label>
            <div className="source-grid">
              <label>
                Publisher
                <input
                  required
                  minLength={2}
                  maxLength={100}
                  value={source.publisher}
                  onChange={(event) =>
                    updateSource(source.id, { publisher: event.target.value })
                  }
                  placeholder="Publisher or agency"
                />
              </label>
              <label>
                Published
                <input
                  type="date"
                  required
                  max={today}
                  value={source.publishedAt}
                  onChange={(event) =>
                    updateSource(source.id, { publishedAt: event.target.value })
                  }
                />
              </label>
              <label>
                Source type
                <select
                  value={source.type}
                  onChange={(event) =>
                    updateSource(source.id, {
                      type: event.target.value as NomineeSource["type"],
                    })
                  }
                >
                  {sourceTypes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              URL
              <input
                type="url"
                required
                value={source.url}
                onChange={(event) =>
                  updateSource(source.id, { url: event.target.value })
                }
                placeholder="https://example.com/evidence"
              />
            </label>
          </div>
        ))}
        <button
          type="button"
          className="button secondary"
          disabled={sources.length >= 3}
          onClick={() =>
            setSources((current) => [
              ...current,
              {
                id: crypto.randomUUID(),
                url: "",
                title: "",
                publisher: "",
                publishedAt: "",
                type: "reporting",
              },
            ])
          }
        >
          + Add another receipt
        </button>
      </fieldset>
      <fieldset className="image-form">
        <legend>Images <span>(optional, up to 3)</span></legend>
        <p className="muted">Add screenshots or other evidence. The first image becomes the ballot-card cover.</p>
        {images.map((image, index) => (
          <div className="image-entry" key={image.id}>
            <div className="image-entry-head">
              <strong>Image {index + 1}{index === 0 ? " · cover" : ""}</strong>
              <button type="button" className="text-button" onClick={() => setImages((current) => current.filter((item) => item.id !== image.id))}>Remove</button>
            </div>
            <label>
              Type
              <select
                value={image.kind}
                onChange={(event) => updateImage(image.id, { kind: event.target.value as DraftImage["kind"], file: undefined, url: "", preview: undefined, uploadedUrl: undefined })}
              >
                <option value="upload">Upload a file</option>
                <option value="external">Use an HTTPS URL</option>
              </select>
            </label>
            {image.kind === "upload" ? (
              <label>
                Image file
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  required={!image.uploadedUrl}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
                      setError("Images must be JPG, PNG, or WebP files under 5 MB.");
                      event.currentTarget.value = "";
                      return;
                    }
                    updateImage(image.id, { file, preview: URL.createObjectURL(file), uploadedUrl: undefined });
                    setError("");
                  }}
                />
              </label>
            ) : (
              <label>
                Image URL
                <input
                  type="url"
                  required
                  value={image.url}
                  onChange={(event) => updateImage(image.id, { url: event.target.value })}
                  placeholder="https://example.com/screenshot.webp"
                />
              </label>
            )}
            <label>
              Image description
              <input
                required
                minLength={5}
                maxLength={300}
                value={image.alt}
                onChange={(event) => updateImage(image.id, { alt: event.target.value })}
                placeholder="What this screenshot shows"
              />
            </label>
            {(image.preview || image.url) && (
              <img className="image-preview" src={image.preview || image.url} alt="" referrerPolicy="no-referrer" />
            )}
          </div>
        ))}
        <div className="image-actions">
          <button type="button" className="button secondary" disabled={images.length >= 3} onClick={() => addImage("upload")}>+ Add upload</button>
          <button type="button" className="button secondary" disabled={images.length >= 3} onClick={() => addImage("external")}>+ Add image URL</button>
        </div>
      </fieldset>
      <div className="honeypot" aria-hidden="true">
        <label>
          Leave this empty
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <p className="muted">
        Nominations publish immediately. Keep it factual, focus on products and
        companies, and follow our <Link href="/rules">submission rules</Link>.
      </p>
      {uploadStatus && <p className="muted" role="status">{uploadStatus}</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button disabled={busy} className="button">
        {busy ? <Loader2 className="spin" size={18} /> : <ArrowUpRight size={18} />} {busy ? "Submitting…" : "Submit nomination"}
      </button>
    </form>
  );
}
export function Report({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="report">
      {sent ? (
        <p role="status">
          <Check size={16} /> Report sent. Thanks for helping keep the ballot
          useful.
        </p>
      ) : !open ? (
        <button className="text-button" onClick={() => setOpen(true)}>
          <Flag size={14} /> Report this nomination
        </button>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await api(`nominees/${id}/report`, {
                reason: new FormData(e.currentTarget).get("reason"),
              });
              setSent(true);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            What should we review?
            <textarea name="reason" required minLength={5} maxLength={1000} />
          </label>
          <button className="button" disabled={busy}>
            Send report
          </button>
          <button
            type="button"
            className="text-button"
            onClick={() => setOpen(false)}
          >
            Cancel
          </button>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
        </form>
      )}
    </div>
  );
}

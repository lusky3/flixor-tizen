import { Modal } from "./Modal";

export interface TrailerModalProps {
  /** YouTube video key (e.g. "dQw4w9WgXcQ") */
  videoKey: string;
  /** Modal title, defaults to "Trailer" */
  title?: string;
  onClose: () => void;
}

/**
 * Modal overlay that embeds a YouTube video player for trailers.
 * Composes the base Modal for backdrop, Back key close, and focus management.
 */
export function TrailerModal({
  videoKey,
  title = "Trailer",
  onClose,
}: TrailerModalProps) {
  return (
    <Modal title={title} onClose={onClose}>
      <div className="trailer-modal-player">
        <iframe
          className="trailer-modal-iframe"
          src={`https://www.youtube.com/embed/${videoKey}?autoplay=1&rel=0`}
          allow="autoplay; encrypted-media"
          allowFullScreen
          title={title}
        />
      </div>
    </Modal>
  );
}

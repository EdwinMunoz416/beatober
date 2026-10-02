"use client";

import { useState } from "react";
import { VisitorUserIcon } from "@/components/VisitorUserIcon";
import { avatarStyleForVisitor } from "@/lib/visitor-profile-ui";

type Props = {
  visitorId: string;
  avatarUrl: string | null | undefined;
  alt: string;
  className?: string;
  iconClassName?: string;
  large?: boolean;
  compact?: boolean;
  /** Green dot = presence in live window (admin). */
  online?: boolean;
};

/** Admin-only: AniList CDN portrait with silhouette fallback. */
export function VisitorAvatar({
  visitorId,
  avatarUrl,
  alt,
  className,
  iconClassName,
  large = false,
  compact = false,
  online = false,
}: Props) {
  const [failed, setFailed] = useState(false);
  const showImage = avatarUrl && !failed;

  return (
    <div
      className={`admin-dash__avatar admin-dash__avatar--hue${large ? " admin-dash__avatar--lg" : ""}${compact ? " admin-dash__avatar--compact" : ""}${showImage ? " admin-dash__avatar--photo" : ""}${online ? " admin-dash__avatar--online" : ""} ${className ?? ""}`.trim()}
      style={avatarStyleForVisitor(visitorId)}
    >
      {online ? (
        <span
          className="admin-dash__avatar-online-dot"
          title="Online now"
          aria-hidden
        />
      ) : null}
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- admin hotlink to AniList CDN
        <img
          className="admin-dash__avatar-photo"
          src={avatarUrl}
          alt={alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <VisitorUserIcon
          className={
            iconClassName ??
            (large
              ? "admin-dash__avatar-icon admin-dash__avatar-icon--lg"
              : "admin-dash__avatar-icon")
          }
        />
      )}
    </div>
  );
}

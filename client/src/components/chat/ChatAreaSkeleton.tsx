import React from "react";

export const ChatAreaSkeleton: React.FC = () => {
  const skeletonItems = [
    { avatarW: "w-9 h-9", nameW: "w-24", contentW: "w-3/4", lines: 2 },
    { avatarW: "w-9 h-9", nameW: "w-32", contentW: "w-1/2", lines: 1 },
    { avatarW: "w-9 h-9", nameW: "w-20", contentW: "w-5/6", lines: 2 },
    { avatarW: "w-9 h-9", nameW: "w-28", contentW: "w-2/5", lines: 1 },
    { avatarW: "w-9 h-9", nameW: "w-36", contentW: "w-4/5", lines: 3 },
  ];

  return (
    <div className="flex-1 min-h-0 px-5 pt-4 pb-1 overflow-hidden flex flex-col justify-end gap-3.5 select-none animate-pulse">
      {skeletonItems.map((item, idx) => (
        <div key={idx} className="flex gap-3 px-3 py-2 rounded-xl">
          {/* Avatar Skeleton */}
          <div className={`${item.avatarW} rounded-xl bg-[var(--border-color)]/70 shrink-0`} />

          {/* Message Content Skeleton */}
          <div className="flex-1 flex flex-col gap-2 pt-0.5">
            <div className="flex items-center gap-2">
              <div className={`h-3.5 ${item.nameW} rounded-md bg-[var(--border-color)]/70`} />
              <div className="h-3 w-12 rounded-md bg-[var(--border-color)]/40" />
            </div>

            <div className={`h-3.5 ${item.contentW} rounded-md bg-[var(--border-color)]/50`} />
            {item.lines >= 2 && (
              <div className="h-3.5 w-3/5 rounded-md bg-[var(--border-color)]/40" />
            )}
            {item.lines >= 3 && (
              <div className="h-3.5 w-2/5 rounded-md bg-[var(--border-color)]/30" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

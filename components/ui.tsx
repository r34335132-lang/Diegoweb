"use client";

import { X } from "lucide-react";

export function PageHeader({ title, subtitle, children }: {
  title: string; subtitle: string; children?: React.ReactNode;
}) {
  return (
    <div className="page-head">
      <div><h1 className="page-title">{title}</h1><p className="page-subtitle">{subtitle}</p></div>
      {children ? <div className="actions">{children}</div> : null}
    </div>
  );
}

export function Modal({ open, title, onClose, children }: {
  open: boolean; title: string; onClose: () => void; children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="btn btn-secondary btn-icon" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Initials({ name, image }: { name: string; image?: string | null }) {
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return <span className="avatar">{image ? <img src={image} alt="" /> : initials || "?"}</span>;
}

export function Empty({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div className="empty">{icon}<div>{text}</div></div>;
}

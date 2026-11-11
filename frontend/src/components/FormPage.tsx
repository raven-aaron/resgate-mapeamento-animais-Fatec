import type { HTMLAttributes, ReactNode } from "react";

type FormPageProps = {
  eyebrow?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  as?: "main" | "div";
};

type FormPanelProps = HTMLAttributes<HTMLElement>;

export function FormPanel({ children, className = "", ...props }: FormPanelProps) {
  return (
    <section className={`form-panel ${className}`.trim()} {...props}>
      {children}
    </section>
  );
}

export default function FormPage({
  eyebrow,
  title,
  description,
  children,
  className = "",
  contentClassName = "",
  as = "main",
}: FormPageProps) {
  const Content = as;

  return (
    <Content className={`form-shell ${className}`.trim()}>
      {(eyebrow || title || description) && (
        <header className="form-heading">
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          {title && <h1>{title}</h1>}
          {description && <p>{description}</p>}
        </header>
      )}
      <div className={contentClassName}>{children}</div>
    </Content>
  );
}

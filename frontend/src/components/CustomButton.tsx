"use client";

import Link from "next/link";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  Ref,
} from "react";

export type CustomButtonVariant = "orange" | "gray" | "red" | "green";
export type CustomButtonSize = "small" | "medium" | "large" | "icon";

interface CustomButtonStyleProps {
  variant?: CustomButtonVariant;
  size?: CustomButtonSize;
  fullWidth?: boolean;
}

type NativeButtonProps = CustomButtonStyleProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { href?: never; ref?: Ref<HTMLButtonElement> };
type LinkButtonProps = CustomButtonStyleProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { href: string; type?: never };

export type CustomButtonProps = NativeButtonProps | LinkButtonProps;

function buttonClassName(
  variant: CustomButtonVariant,
  size: CustomButtonSize,
  fullWidth: boolean,
  className?: string,
) {
  return [
    "custom-button",
    `custom-button--${variant}`,
    `custom-button--${size}`,
    fullWidth && "custom-button--full-width",
    className,
  ].filter(Boolean).join(" ");
}

export default function CustomButton(props: CustomButtonProps) {
  if (typeof props.href === "string") {
    const {
      href,
      variant = "orange",
      size = "medium",
      fullWidth = false,
      className,
      children,
      ...linkProps
    } = props;
    return (
      <Link href={href} {...linkProps} className={buttonClassName(variant, size, fullWidth, className)}>
        {children}
      </Link>
    );
  }

  const {
    variant = "orange",
    size = "medium",
    fullWidth = false,
    className,
    ref,
    type = "button",
    children,
    ...buttonProps
  } = props;
  return (
    <button
      {...buttonProps}
      ref={ref}
      type={type}
      className={buttonClassName(variant, size, fullWidth, className)}
    >{children}</button>
  );
}
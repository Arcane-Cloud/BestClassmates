"use client";

import type { ImgHTMLAttributes } from "react";

export function Portrait({ alt, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  return <img {...props} alt={alt ?? ""} onError={(event) => {
    const image = event.currentTarget;
    if (!image.src.endsWith("/images/placeholder.svg")) image.src = "/images/placeholder.svg";
  }} />;
}

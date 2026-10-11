"use client";

import { useId, useRef, useState } from "react";
import { ImagePlus, LoaderCircle, RotateCw, Upload, X } from "lucide-react";
import { Portrait } from "../portrait";
import { isSafeImageUrl } from "@/lib/validation";
import { completeImageUpload, uploadImage, UploadCompletionError } from "@/lib/upload-client";
import type { UploadStage } from "@/lib/upload-contract";

const stageLabels: Record<UploadStage, string> = { authorizing: "获取上传凭据…", uploading: "直传 Azure…", processing: "云端处理图片…" };

export function ImageField({ label, value, onChange, onUploadStateChange, hint, required = false, error, disabled = false }: {
  label: string; value: string; onChange: (value: string) => void; onUploadStateChange: (busy: boolean) => void;
  hint?: string; required?: boolean; error?: string; disabled?: boolean;
}) {
  const id = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<UploadStage>("authorizing");
  const [uploadError, setUploadError] = useState("");
  const [retryId, setRetryId] = useState<string | null>(null);

  const runUpload = async (task: () => Promise<string>) => {
    setUploadError(""); setRetryId(null); setBusy(true); onUploadStateChange(true);
    try { onChange(await task()); }
    catch (error) {
      if (error instanceof UploadCompletionError) setRetryId(error.uploadId);
      setUploadError(error instanceof Error ? error.message : "上传失败，请重试");
    } finally { setBusy(false); onUploadStateChange(false); if (fileInput.current) fileInput.current.value = ""; }
  };
  const upload = (file?: File) => {
    if (!file) return;
    setStage("authorizing");
    void runUpload(() => uploadImage(file, setStage));
  };
  const retry = () => {
    if (!retryId) return;
    const uploadId = retryId;
    setStage("processing");
    void runUpload(() => completeImageUpload(uploadId));
  };

  return <div className="image-field"><div className="field-label"><label htmlFor={id}>{label}{required && <span> *</span>}</label>{hint && <span>{hint}</span>}</div><div className={`image-upload-area ${value ? "has-image" : ""}`}>
    {value && isSafeImageUrl(value) ? <Portrait src={value} alt={`${label}预览`} /> : <div className="upload-placeholder"><ImagePlus size={29} strokeWidth={1.2} /><span>为人物选择一张有故事的图片</span></div>}
    <div className="upload-area-actions"><button type="button" className="upload-button" disabled={disabled || busy} onClick={() => fileInput.current?.click()}>{busy ? <LoaderCircle size={15} className="spin" /> : <Upload size={15} />}{busy ? stageLabels[stage] : value ? "更换图片" : "上传图片"}</button>{value && <button type="button" className="upload-remove" disabled={disabled || busy} aria-label={`移除${label}`} onClick={() => { onChange(""); setRetryId(null); setUploadError(""); }}><X size={15} /></button>}</div></div>
    <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} aria-label={`上传${label}`} disabled={disabled || busy} onChange={(event) => upload(event.target.files?.[0])} />
    <input id={id} type="text" className="form-input image-url-input" placeholder="或粘贴 HTTPS 图片地址" value={value} onChange={(event) => { onChange(event.target.value); setRetryId(null); setUploadError(""); }} disabled={disabled || busy} aria-invalid={!!error || !!uploadError} aria-describedby={`${id}-help`} />
    <span id={`${id}-help`} role={error || uploadError ? "alert" : "status"} className={error || uploadError ? "field-error" : "field-hint"}>{busy ? stageLabels[stage] : error || uploadError || "JPG / PNG / WebP · 最大 5 MB · Azure 私有存储 · 云端安全处理"}</span>
    {retryId && !busy && <button type="button" className="small-add" onClick={retry} disabled={disabled}><RotateCw size={14} />重试云端处理（无需重新上传）</button>}
  </div>;
}

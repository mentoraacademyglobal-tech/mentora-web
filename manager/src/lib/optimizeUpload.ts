/** Browser-side optimization. Originals survive unsupported formats or encoder failures. */
export async function optimizeUpload(file: File, preserveResolution = false): Promise<File> {
 if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size < 100_000 || file.size > 20_000_000) return file;
 if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return file;
 let bitmap: ImageBitmap | undefined;
 try {
  // Animated PNG/WebP must not silently become a single-frame image.
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (file.type === 'image/png' || file.type === 'image/webp') {
   const marker = file.type === 'image/png' ? [97,99,84,76] : [65,78,73,77];
   if (bytes.some((_,i)=>marker.every((b,j)=>bytes[i+j]===b))) return file;
  }
  bitmap = await createImageBitmap(file);
  if (!bitmap.width || !bitmap.height || bitmap.width*bitmap.height > 24_000_000 || Math.max(bitmap.width,bitmap.height)>8192) return file;
  const scale = preserveResolution ? 1 : Math.min(1,2560/Math.max(bitmap.width,bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1,Math.round(bitmap.width*scale));
  canvas.height = Math.max(1,Math.round(bitmap.height*scale));
  const context = canvas.getContext('2d');
  if (!context) return file;
  context.drawImage(bitmap,0,0,canvas.width,canvas.height);
  const blob = await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/webp',preserveResolution?0.96:0.9));
  // Avoid unnecessary conversion for negligible savings or unsupported encoders.
  if (!blob || blob.type!=='image/webp' || blob.size>=file.size*0.95) return file;
  return new File([blob],file.name.replace(/\.[^.]+$/,'')+'.webp',{type:'image/webp',lastModified:file.lastModified});
 } catch { return file; }
 finally { bitmap?.close(); }
}

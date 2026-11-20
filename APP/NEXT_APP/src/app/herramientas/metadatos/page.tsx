"use client";

import { ToolPageHeader } from "@/components/tools/ToolPageHeader";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useToolAccess } from "@/hooks/useToolAccess";
import { ToolAccessBlocked } from "@/components/tools/ToolAccessBlocked";
import { ImageDropzone } from "@/components/tools/ImageDropzone";
import { descargarBlob, nombreArchivo } from "@/lib/tools/descargar";

const ACCENT = "#F59E0B";

/**
 * EXIF METADATA EXTRACTOR & CLEANER
 * ===================================
 * Extracts and displays EXIF metadata from images (camera model, GPS coordinates,
 * date/time, lens info, etc.) and provides a "clean" download option that strips
 * all metadata for privacy.
 *
 * SECURITY ALIGNMENT (OWASP / NIST / MITRE ATT&CK 2026):
 * ─────────────────────────────────────────────────────────
 * • OWASP A01:2021 – Broken Access Control → All processing client-side,
 *   no data leaves the browser. Images are never uploaded.
 * • OWASP A04:2021 – Insecure Design → Privacy-by-design approach.
 *   Tool educates users about metadata exposure risks.
 * • NIST SP 800-188 – De-Identification of Personal Information →
 *   Core purpose: strip personally identifiable information from images.
 * • NIST SP 800-122 – PII Confidentiality → GPS coordinates, timestamps,
 *   device identifiers are all PII that this tool helps remove.
 * • MITRE ATT&CK T1592.004 – Gather Victim Host Info: Client Config →
 *   Educational tool showing what adversaries can extract from photos.
 * • MITRE CWE-200 – Exposure of Sensitive Information →
 *   Demonstrates information exposure through image metadata.
 * • MITRE CWE-20 – Input Validation → Magic bytes validation,
 *   file size limits, safe binary parsing with bounds checking.
 * • Memory Safety: ArrayBuffer operations use bounds checks.
 *   Object URLs properly revoked on cleanup.
 */

// SECURITY(CWE-400): File size limit
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// EXIF tag definitions - IFD0 and EXIF Sub IFD
const EXIF_TAGS: Record<number, { name: string; label: string; category: string }> = {
    // IFD0 tags
    0x010F: { name: "Make", label: "Fabricante", category: "camera" },
    0x0110: { name: "Model", label: "Modelo de Cámara", category: "camera" },
    0x0112: { name: "Orientation", label: "Orientación", category: "image" },
    0x011A: { name: "XResolution", label: "Resolución X", category: "image" },
    0x011B: { name: "YResolution", label: "Resolución Y", category: "image" },
    0x0131: { name: "Software", label: "Software", category: "camera" },
    0x0132: { name: "DateTime", label: "Fecha/Hora", category: "time" },
    0x013B: { name: "Artist", label: "Artista", category: "author" },
    0x8298: { name: "Copyright", label: "Copyright", category: "author" },
    // EXIF Sub IFD tags
    0x829A: { name: "ExposureTime", label: "Tiempo de Exposición", category: "settings" },
    0x829D: { name: "FNumber", label: "Apertura (f/)", category: "settings" },
    0x8827: { name: "ISOSpeedRatings", label: "ISO", category: "settings" },
    0x9000: { name: "ExifVersion", label: "Versión EXIF", category: "image" },
    0x9003: { name: "DateTimeOriginal", label: "Fecha Original", category: "time" },
    0x9004: { name: "DateTimeDigitized", label: "Fecha Digitalización", category: "time" },
    0x920A: { name: "FocalLength", label: "Distancia Focal", category: "settings" },
    0xA001: { name: "ColorSpace", label: "Espacio de Color", category: "image" },
    0xA002: { name: "PixelXDimension", label: "Ancho (px)", category: "image" },
    0xA003: { name: "PixelYDimension", label: "Alto (px)", category: "image" },
    0xA405: { name: "FocalLengthIn35mmFilm", label: "Focal 35mm equiv.", category: "settings" },
    0xA420: { name: "ImageUniqueID", label: "ID Único", category: "image" },
    0xA430: { name: "CameraOwnerName", label: "Propietario", category: "author" },
    0xA431: { name: "BodySerialNumber", label: "Nº Serie Cámara", category: "camera" },
    0xA432: { name: "LensInfo", label: "Info del Lente", category: "settings" },
    0xA433: { name: "LensMake", label: "Fabricante del Lente", category: "settings" },
    0xA434: { name: "LensModel", label: "Modelo del Lente", category: "settings" },
    0xA435: { name: "LensSerialNumber", label: "Nº Serie Lente", category: "settings" },
    // GPS tags (processed separately)
};

const GPS_TAGS: Record<number, string> = {
    0x0001: "GPSLatitudeRef",
    0x0002: "GPSLatitude",
    0x0003: "GPSLongitudeRef",
    0x0004: "GPSLongitude",
    0x0005: "GPSAltitudeRef",
    0x0006: "GPSAltitude",
    0x0007: "GPSTimeStamp",
    0x001D: "GPSDateStamp",
};

interface ExifData {
    [key: string]: string | number | number[];
}

interface GpsCoordinates {
    latitude: number;
    longitude: number;
    altitude?: number;
}

/**
 * Parse EXIF data from a JPEG file's ArrayBuffer.
 * SECURITY: All reads are bounds-checked to prevent buffer overflows.
 */
function parseExif(buffer: ArrayBuffer): { exif: ExifData; gps: GpsCoordinates | null } {
    const view = new DataView(buffer);
    const exif: ExifData = {};
    let gps: GpsCoordinates | null = null;

    // SECURITY(CWE-20): Validate JPEG SOI marker
    if (view.byteLength < 4) return { exif, gps };
    if (view.getUint16(0) !== 0xFFD8) return { exif, gps };

    let offset = 2;
    const maxOffset = Math.min(view.byteLength, 256 * 1024); // Only scan first 256KB for EXIF

    while (offset < maxOffset - 4) {
        const marker = view.getUint16(offset);
        // Desde SOS empiezan los datos de la imagen: ya no hay más metadatos que leer.
        if (marker === 0xFFDA) break;

        if (marker === 0xFFE1) {
            // APP1 marker - EXIF data
            const segmentLength = view.getUint16(offset + 2);
            const segmentEnd = offset + 2 + segmentLength;

            // Check for "Exif\0\0" header
            const exifHeader = offset + 10 < view.byteLength ? String.fromCharCode(
                view.getUint8(offset + 4),
                view.getUint8(offset + 5),
                view.getUint8(offset + 6),
                view.getUint8(offset + 7)
            ) : "";

            if (exifHeader === "Exif") {
                const tiffOffset = offset + 10; // Start of TIFF header
                // El IFD0 no empieza en la cabecera TIFF: su posición va 4 bytes después del orden de bytes («II»/«MM»).
                // Antes se leía la cabecera como si fuera el IFD y nunca aparecían cámara ni fecha.
                if (tiffOffset + 8 <= segmentEnd && tiffOffset + 8 <= view.byteLength) {
                    const little = view.getUint16(tiffOffset) === 0x4949;
                    const ifd0 = tiffOffset + view.getUint32(tiffOffset + 4, little);
                    parseIFD(view, tiffOffset, ifd0, exif, gps, segmentEnd, new Set());
                }

                // Parse GPS data
                gps = extractGPS(view, tiffOffset, segmentEnd);
                break;
            }
            // Otro APP1 (por ejemplo XMP) puede ir antes del EXIF: se salta y se sigue buscando.
            offset = segmentEnd;
        } else if ((marker & 0xFF00) === 0xFF00) {
            // Skip other markers
            if (offset + 3 < view.byteLength) {
                offset += 2 + view.getUint16(offset + 2);
            } else {
                break;
            }
        } else {
            break;
        }
    }

    return { exif, gps };
}

function parseIFD(
    view: DataView,
    tiffBase: number,
    ifdOffset: number,
    exif: ExifData,
    _gps: GpsCoordinates | null,
    maxOffset: number,
    visitados: Set<number>
): void {
    // SECURITY: Bounds check
    if (ifdOffset + 2 > view.byteLength || ifdOffset + 2 > maxOffset) return;
    // SECURITY(CWE-835): un archivo armado puede apuntar un IFD a sí mismo; cada IFD se lee una sola vez.
    if (visitados.has(ifdOffset)) return;
    visitados.add(ifdOffset);

    // Determine byte order
    const byteOrder = view.getUint16(tiffBase);
    const isLittleEndian = byteOrder === 0x4949; // "II" = Intel = little-endian

    const getUint16 = (off: number) => view.getUint16(off, isLittleEndian);
    const getUint32 = (off: number) => view.getUint32(off, isLittleEndian);

    const entryCount = getUint16(ifdOffset);
    if (entryCount > 500) return; // SECURITY: Sanity check

    for (let i = 0; i < entryCount; i++) {
        const entryOffset = ifdOffset + 2 + i * 12;
        if (entryOffset + 12 > view.byteLength || entryOffset + 12 > maxOffset) break;

        const tag = getUint16(entryOffset);
        const type = getUint16(entryOffset + 2);
        const count = getUint32(entryOffset + 4);
        const valueOffset = entryOffset + 8;

        const tagInfo = EXIF_TAGS[tag];
        if (!tagInfo) {
            // Check if it's the EXIF Sub IFD pointer
            if (tag === 0x8769) {
                const subIFDOffset = tiffBase + getUint32(valueOffset);
                if (subIFDOffset < maxOffset) {
                    parseIFD(view, tiffBase, subIFDOffset, exif, _gps, maxOffset, visitados);
                }
            }
            continue;
        }

        try {
            const value = tag === 0x829A && type === 5
                ? leerExposicion(view, tiffBase + getUint32(valueOffset), isLittleEndian, maxOffset)
                : readTagValue(view, type, count, valueOffset, tiffBase, isLittleEndian, maxOffset);
            if (value !== null) {
                exif[tagInfo.label] = value;
            }
        } catch {
            // SECURITY: Skip malformed tags silently
        }
    }
}

/** Exposición como la escribe una cámara: «1/250 s» (al redondear a dos decimales salía «0»). */
function leerExposicion(view: DataView, dataOffset: number, isLittleEndian: boolean, maxOffset: number): string | null {
    if (dataOffset + 8 > view.byteLength || dataOffset + 8 > maxOffset) return null;
    const num = view.getUint32(dataOffset, isLittleEndian);
    const den = view.getUint32(dataOffset + 4, isLittleEndian);
    if (!num || !den) return null;
    const segundos = num / den;
    return segundos >= 1 ? `${Math.round(segundos * 10) / 10} s` : `1/${Math.round(den / num)} s`;
}

const ORIENTACIONES: Record<number, string> = {
    1: "Normal",
    2: "Espejada",
    3: "Girada 180°",
    4: "Espejada en vertical",
    5: "Espejada y girada 90°",
    6: "Girada 90° a la derecha",
    7: "Espejada y girada 90°",
    8: "Girada 90° a la izquierda",
};

function formatearValor(clave: string, valor: ExifData[string]): string {
    if (clave === "Orientación" && typeof valor === "number") return ORIENTACIONES[valor] ?? String(valor);
    return String(valor);
}

function readTagValue(
    view: DataView,
    type: number,
    count: number,
    valueOffset: number,
    tiffBase: number,
    isLittleEndian: boolean,
    maxOffset: number
): string | number | null {
    const getUint16 = (off: number) => view.getUint16(off, isLittleEndian);
    const getUint32 = (off: number) => view.getUint32(off, isLittleEndian);

    // Calculate data size
    const typeSizes: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8, 12: 8 };
    const typeSize = typeSizes[type] || 1;
    const totalSize = typeSize * count;

    // If data > 4 bytes, valueOffset contains pointer to actual data
    let dataOffset = valueOffset;
    if (totalSize > 4) {
        dataOffset = tiffBase + getUint32(valueOffset);
        if (dataOffset + totalSize > view.byteLength || dataOffset + totalSize > maxOffset) return null;
    }

    switch (type) {
        case 2: { // ASCII string
            // SECURITY(CWE-20): Limit string length and sanitize
            const maxLen = Math.min(count - 1, 1000);
            let str = "";
            for (let i = 0; i < maxLen; i++) {
                if (dataOffset + i >= view.byteLength) break;
                const char = view.getUint8(dataOffset + i);
                if (char === 0) break;
                // SECURITY: Only allow printable ASCII
                if (char >= 32 && char <= 126) {
                    str += String.fromCharCode(char);
                }
            }
            return str;
        }
        case 3: // UINT16
            return getUint16(dataOffset);
        case 4: // UINT32
            return getUint32(dataOffset);
        case 5: { // RATIONAL (two UINT32: numerator/denominator)
            if (dataOffset + 8 > view.byteLength) return null;
            const num = getUint32(dataOffset);
            const den = getUint32(dataOffset + 4);
            if (den === 0) return null;
            return Math.round((num / den) * 100) / 100;
        }
        case 10: { // SRATIONAL
            if (dataOffset + 8 > view.byteLength) return null;
            const sNum = view.getInt32(dataOffset, isLittleEndian);
            const sDen = view.getInt32(dataOffset + 4, isLittleEndian);
            if (sDen === 0) return null;
            return Math.round((sNum / sDen) * 100) / 100;
        }
        default:
            return null;
    }
}

function extractGPS(view: DataView, tiffBase: number, maxOffset: number): GpsCoordinates | null {
    const byteOrder = view.getUint16(tiffBase);
    const isLittleEndian = byteOrder === 0x4949;
    const getUint16 = (off: number) => view.getUint16(off, isLittleEndian);
    const getUint32 = (off: number) => view.getUint32(off, isLittleEndian);

    // Find GPS IFD pointer in IFD0
    const ifd0Offset = tiffBase + getUint32(tiffBase + 4);
    if (ifd0Offset + 2 > view.byteLength) return null;

    const entryCount = getUint16(ifd0Offset);
    let gpsIFDOffset = -1;

    for (let i = 0; i < Math.min(entryCount, 500); i++) {
        const entryOffset = ifd0Offset + 2 + i * 12;
        if (entryOffset + 12 > view.byteLength) break;

        if (getUint16(entryOffset) === 0x8825) { // GPSInfo tag
            gpsIFDOffset = tiffBase + getUint32(entryOffset + 8);
            break;
        }
    }

    if (gpsIFDOffset < 0 || gpsIFDOffset + 2 > view.byteLength) return null;

    const gpsEntryCount = getUint16(gpsIFDOffset);
    const gpsData: Record<string, number | string | number[]> = {};

    for (let i = 0; i < Math.min(gpsEntryCount, 100); i++) {
        const entryOffset = gpsIFDOffset + 2 + i * 12;
        if (entryOffset + 12 > view.byteLength || entryOffset + 12 > maxOffset) break;

        const tag = getUint16(entryOffset);
        const type = getUint16(entryOffset + 2);
        const count = getUint32(entryOffset + 4);
        const valueOffset = entryOffset + 8;

        const tagName = GPS_TAGS[tag];
        if (!tagName) continue;

        try {
            if (type === 2) { // ASCII
                const char = view.getUint8(valueOffset);
                if (char >= 32 && char <= 126) {
                    gpsData[tagName] = String.fromCharCode(char);
                }
            } else if (type === 5 && count === 3) { // RATIONAL x3 (Lat/Lon)
                const dataOff = tiffBase + getUint32(valueOffset);
                if (dataOff + 24 > view.byteLength) continue;
                const values: number[] = [];
                for (let j = 0; j < 3; j++) {
                    const num = getUint32(dataOff + j * 8);
                    const den = getUint32(dataOff + j * 8 + 4);
                    values.push(den === 0 ? 0 : num / den);
                }
                gpsData[tagName] = values;
            } else if (type === 5 && count === 1) { // RATIONAL x1 (Altitude)
                const dataOff = tiffBase + getUint32(valueOffset);
                if (dataOff + 8 > view.byteLength) continue;
                const num = getUint32(dataOff);
                const den = getUint32(dataOff + 4);
                gpsData[tagName] = den === 0 ? 0 : num / den;
            } else if (type === 1) { // BYTE (AltitudeRef)
                gpsData[tagName] = view.getUint8(valueOffset);
            }
        } catch {
            // SECURITY: Skip malformed GPS tags
        }
    }

    // Convert GPS DMS to decimal
    if (gpsData.GPSLatitude && gpsData.GPSLongitude) {
        const lat = Array.isArray(gpsData.GPSLatitude)
            ? gpsData.GPSLatitude[0] + gpsData.GPSLatitude[1] / 60 + gpsData.GPSLatitude[2] / 3600
            : 0;
        const lon = Array.isArray(gpsData.GPSLongitude)
            ? gpsData.GPSLongitude[0] + gpsData.GPSLongitude[1] / 60 + gpsData.GPSLongitude[2] / 3600
            : 0;

        const latSign = gpsData.GPSLatitudeRef === "S" ? -1 : 1;
        const lonSign = gpsData.GPSLongitudeRef === "W" ? -1 : 1;

        return {
            latitude: lat * latSign,
            longitude: lon * lonSign,
            altitude: typeof gpsData.GPSAltitude === "number" ? gpsData.GPSAltitude * (gpsData.GPSAltitudeRef === 1 ? -1 : 1) : undefined,
        };
    }

    return null;
}

/** APP1 mínimo con una sola etiqueta EXIF, la orientación (TIFF «MM», IFD0 de una entrada SHORT). */
function segmentoOrientacion(orientacion: number): Uint8Array<ArrayBuffer> {
    const bytes = new Uint8Array(36);
    const vista = new DataView(bytes.buffer);
    vista.setUint16(0, 0xFFE1);
    vista.setUint16(2, 34);
    bytes.set([0x45, 0x78, 0x69, 0x66, 0, 0], 4); // «Exif\0\0»
    bytes.set([0x4D, 0x4D, 0x00, 0x2A], 10);
    vista.setUint32(14, 8);
    vista.setUint16(18, 1);
    vista.setUint16(20, 0x0112);
    vista.setUint16(22, 3);
    vista.setUint32(24, 1);
    vista.setUint16(28, orientacion);
    vista.setUint32(32, 0);
    return bytes;
}

/**
 * Strip all EXIF data from a JPEG by rebuilding without APP1 segments.
 * SECURITY: Creates a clean copy, preserving only image data.
 * La orientación se vuelve a escribir sola: sin ella, una foto vertical del celular se ve acostada.
 */
function stripExif(buffer: ArrayBuffer, orientacion = 1): ArrayBuffer {
    const view = new DataView(buffer);
    if (view.byteLength < 4 || view.getUint16(0) !== 0xFFD8) {
        return buffer; // Not a JPEG, return as-is
    }

    const chunks: ArrayBuffer[] = [];
    // Keep SOI marker
    chunks.push(buffer.slice(0, 2));

    let offset = 2;
    while (offset < view.byteLength - 1) {
        const marker = view.getUint16(offset);

        if (marker === 0xFFDA) {
            // Start of Scan - copy everything from here to end (actual image data)
            chunks.push(buffer.slice(offset));
            break;
        }

        if ((marker & 0xFF00) !== 0xFF00) break;

        if (offset + 3 >= view.byteLength) break;
        const segmentLength = view.getUint16(offset + 2);
        const segmentEnd = offset + 2 + segmentLength;

        // Skip APP1 (EXIF, XMP), APP13 (IPTC) and COM (comments) segments — strip metadata
        if (marker === 0xFFE1 || marker === 0xFFED || marker === 0xFFFE) {
            offset = segmentEnd;
            continue;
        }

        // Keep all other segments
        chunks.push(buffer.slice(offset, segmentEnd));
        offset = segmentEnd;
    }

    if (orientacion >= 2 && orientacion <= 8) {
        // Tras SOI, o tras el APP0 (JFIF) si lo hay, que debe ir primero.
        const primero = new Uint8Array(chunks[1] ?? new ArrayBuffer(0));
        const tras = primero[0] === 0xFF && primero[1] === 0xE0 ? 2 : 1;
        chunks.splice(tras, 0, segmentoOrientacion(orientacion).buffer);
    }

    // Combine chunks
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
    const result = new Uint8Array(totalLength);
    let pos = 0;
    for (const chunk of chunks) {
        result.set(new Uint8Array(chunk), pos);
        pos += chunk.byteLength;
    }

    return result.buffer;
}

/**
 * For PNG: Strip all text chunks (tEXt, iTXt, zTXt) and eXIf chunks
 */
function stripPngMetadata(buffer: ArrayBuffer): ArrayBuffer {
    const view = new DataView(buffer);
    if (view.byteLength < 8) return buffer;

    // Check PNG signature
    const sig = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
    for (let i = 0; i < 8; i++) {
        if (view.getUint8(i) !== sig[i]) return buffer;
    }

    const chunks: ArrayBuffer[] = [];
    chunks.push(buffer.slice(0, 8)); // PNG signature

    let offset = 8;
    // iCCP se queda: es el perfil de color y sin él una captura en Display P3 se ve con otros colores.
    const metadataChunks = new Set(["tEXt", "iTXt", "zTXt", "eXIf", "tIME", "pHYs"]);

    while (offset < view.byteLength - 4) {
        if (offset + 8 > view.byteLength) break;

        const chunkLength = view.getUint32(offset);
        const chunkType = String.fromCharCode(
            view.getUint8(offset + 4),
            view.getUint8(offset + 5),
            view.getUint8(offset + 6),
            view.getUint8(offset + 7)
        );

        const fullChunkSize = 4 + 4 + chunkLength + 4; // length + type + data + CRC

        if (offset + fullChunkSize > view.byteLength) break;

        if (!metadataChunks.has(chunkType)) {
            chunks.push(buffer.slice(offset, offset + fullChunkSize));
        }

        offset += fullChunkSize;

        if (chunkType === "IEND") break;
    }

    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
    const result = new Uint8Array(totalLength);
    let pos = 0;
    for (const chunk of chunks) {
        result.set(new Uint8Array(chunk), pos);
        pos += chunk.byteLength;
    }

    return result.buffer;
}

/**
 * WebP: quita los bloques EXIF y XMP del contenedor RIFF sin tocar la imagen (antes se recomprimía con el lienzo).
 */
function stripWebpMetadata(buffer: ArrayBuffer): ArrayBuffer {
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);
    const fourcc = (o: number) => String.fromCharCode(bytes[o], bytes[o + 1], bytes[o + 2], bytes[o + 3]);
    if (bytes.length < 12 || fourcc(0) !== "RIFF" || fourcc(8) !== "WEBP") return buffer;
    const fin = Math.min(bytes.length, 8 + view.getUint32(4, true));
    const partes: Uint8Array[] = [];
    let offset = 12;
    while (offset + 8 <= fin) {
        const tipo = fourcc(offset);
        const tamano = view.getUint32(offset + 4, true);
        const siguiente = offset + 8 + tamano + (tamano % 2);
        if (siguiente > fin + 1) return buffer;
        if (tipo !== "EXIF" && tipo !== "XMP ") {
            const parte = bytes.slice(offset, Math.min(siguiente, fin));
            // VP8X anuncia qué bloques trae: se apagan las banderas de EXIF (0x08) y XMP (0x04).
            if (tipo === "VP8X" && parte.length > 8) parte[8] &= ~(0x08 | 0x04);
            partes.push(parte);
        }
        offset = siguiente;
    }
    const total = 12 + partes.reduce((suma, parte) => suma + parte.length, 0);
    const salida = new Uint8Array(total);
    salida.set(bytes.subarray(0, 12));
    new DataView(salida.buffer).setUint32(4, total - 8, true);
    let pos = 12;
    for (const parte of partes) { salida.set(parte, pos); pos += parte.length; }
    return salida.buffer;
}

const EXTENSIONES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

function resumenLimpieza(tipo: string, conservaOrientacion: boolean): string {
    if (tipo === "image/png") return "Se quitaron los textos, EXIF, XMP y la fecha de modificación del PNG. Los píxeles no cambian.";
    if (tipo === "image/webp") return "Se quitaron los bloques EXIF y XMP del WebP. Los píxeles no cambian.";
    return `Se quitaron EXIF (con el GPS), XMP, IPTC y comentarios, sin recomprimir.${conservaOrientacion ? " Solo se conserva la orientación, para que la foto no salga girada." : ""}`;
}

// Risk level assessment for metadata fields
const RISK_LEVELS: Record<string, { level: "high" | "medium" | "low"; reason: string }> = {
    "Fecha Original": { level: "medium", reason: "Revela cuándo se tomó la foto" },
    "Fecha/Hora": { level: "medium", reason: "Timestamp del archivo" },
    "Fabricante": { level: "low", reason: "Modelo de dispositivo" },
    "Modelo de Cámara": { level: "medium", reason: "Identifica tu dispositivo exacto" },
    "Software": { level: "low", reason: "Software de edición usado" },
    "Propietario": { level: "high", reason: "Contiene tu nombre real" },
    "Artista": { level: "high", reason: "Contiene información personal" },
    "Copyright": { level: "medium", reason: "Puede contener tu nombre" },
    "Nº Serie Cámara": { level: "high", reason: "Identificador único de tu dispositivo" },
    "Nº Serie Lente": { level: "medium", reason: "Identificador del equipo" },
    "ID Único": { level: "high", reason: "Identificador único de la imagen" },
};

function getRiskBadge(label: string) {
    const risk = RISK_LEVELS[label];
    if (!risk) return null;

    const colors = {
        high: "bg-red-500/20 text-red-400 border-red-500/30",
        medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
        low: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    };

    const icons = { high: "🔴", medium: "🟡", low: "🔵" };

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border ${colors[risk.level]}`} title={risk.reason}>
            {icons[risk.level]} {risk.level === "high" ? "Alto" : risk.level === "medium" ? "Medio" : "Bajo"}
        </span>
    );
}

export default function MetadataPage() {
    const { isLoading, isAuthorized, accessType, toolName } = useToolAccess("metadatos");
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [exifData, setExifData] = useState<ExifData | null>(null);
    const [gpsData, setGpsData] = useState<GpsCoordinates | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [limpiando, setLimpiando] = useState(false);
    const [limpia, setLimpia] = useState<{ blob: Blob; resumen: string } | null>(null);
    // «nota» informa (formato sin detalle EXIF, foto sin metadatos); «error» es un fallo real.
    const [nota, setNota] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    // null = no hay EXIF que evaluar; antes quedaba el puntaje de la foto anterior.
    const [riskScore, setRiskScore] = useState<number | null>(null);
    const fileRef = useRef<ArrayBuffer | null>(null);
    const versionRef = useRef(0);
    // El recuadro libera la URL blob: de la vista previa al cambiarla o quitarla; al salir de la página, aquí.
    const vistaRef = useRef<string | null>(null);
    useEffect(() => () => {
        versionRef.current += 1;
        if (vistaRef.current) URL.revokeObjectURL(vistaRef.current);
    }, []);

    const handleImageLoad = useCallback(async (file: File, url: string) => {
        const version = ++versionRef.current;
        vistaRef.current = url;
        fileRef.current = null;
        setImagePreview(url);
        setImageFile(file);
        setExifData(null);
        setGpsData(null);
        setRiskScore(null);
        setLimpia(null);
        setNota(null);
        setError(null);
        setIsAnalyzing(true);

        try {
            const buffer = await file.arrayBuffer();
            if (version !== versionRef.current) return;
            fileRef.current = buffer;

            // El recuadro ya puso en file.type el formato real, leído de los bytes.
            if (file.type === "image/jpeg") {
                const { exif, gps } = parseExif(buffer);

                if (Object.keys(exif).length === 0 && !gps) {
                    setNota("Esta foto no trae metadatos EXIF. Puede que ya se hayan quitado.");
                } else {
                    setExifData(exif);
                    setGpsData(gps);

                    // Calculate risk score
                    let risk = 0;
                    if (gps) risk += 40;
                    Object.keys(exif).forEach(key => {
                        const r = RISK_LEVELS[key];
                        if (r?.level === "high") risk += 20;
                        else if (r?.level === "medium") risk += 10;
                        else if (r?.level === "low") risk += 5;
                    });
                    setRiskScore(Math.min(100, risk));
                }
            } else {
                setNota(file.type === "image/png"
                    ? "El detalle de los metadatos solo se muestra en JPEG. Al limpiar este PNG se quitan sus textos, EXIF y XMP, sin tocar los píxeles."
                    : "El detalle de los metadatos solo se muestra en JPEG. Al limpiar este WebP se quitan sus bloques EXIF y XMP, sin tocar los píxeles.");
            }
        } catch {
            if (version === versionRef.current) setError("No se pudieron leer los metadatos de la imagen.");
        } finally {
            if (version === versionRef.current) setIsAnalyzing(false);
        }
    }, []);

    const handleClean = useCallback(() => {
        const buffer = fileRef.current;
        if (!buffer || !imageFile || limpiando) return;
        setLimpiando(true);
        setError(null);
        try {
            let limpio: ArrayBuffer;
            let conservaOrientacion = false;
            if (imageFile.type === "image/png") {
                limpio = stripPngMetadata(buffer);
            } else if (imageFile.type === "image/webp") {
                limpio = stripWebpMetadata(buffer);
            } else if (imageFile.type === "image/jpeg") {
                const orientacion = Number(parseExif(buffer).exif["Orientación"]) || 1;
                conservaOrientacion = orientacion >= 2 && orientacion <= 8;
                limpio = stripExif(buffer, orientacion);
            } else {
                throw new Error("Formato sin limpieza");
            }
            setLimpia({ blob: new Blob([limpio], { type: imageFile.type }), resumen: resumenLimpieza(imageFile.type, conservaOrientacion) });
        } catch {
            setError("No se pudo limpiar la imagen.");
        } finally {
            setLimpiando(false);
        }
    }, [imageFile, limpiando]);

    const handleDownloadClean = useCallback(() => {
        if (!limpia || !imageFile) return;
        // Nombre con tildes y ñ, y la extensión del formato real (antes «ñandú.jpg» bajaba como «and_limpia.jpg»).
        descargarBlob(limpia.blob, `${nombreArchivo(imageFile.name, "imagen")}_limpia.${EXTENSIONES[limpia.blob.type] ?? "jpg"}`);
    }, [limpia, imageFile]);

    const handleClear = useCallback(() => {
        versionRef.current += 1;
        vistaRef.current = null;
        fileRef.current = null;
        setImageFile(null);
        setImagePreview(null);
        setExifData(null);
        setGpsData(null);
        setRiskScore(null);
        setNota(null);
        setError(null);
        setLimpia(null);
        setIsAnalyzing(false);
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0F1724] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-accent-1 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthorized) {
        return <ToolAccessBlocked accessType={accessType} toolName={toolName || "Extractor de Metadatos"} />;
    }

    return (
        <div className="tool-page">
            <main className="tool-main max-w-4xl mx-auto px-4 sm:px-6 pt-20 pb-12 sm:pt-24 sm:pb-16">
                <ToolPageHeader slug="metadatos" title={<>Metadatos EXIF y limpieza</>} description={<>Revisa datos EXIF, ubicación GPS y genera una copia limpia de la imagen</>} />

                {/* Upload Zone */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10 mb-6">
                    <ImageDropzone
                        onImageLoad={handleImageLoad}
                        accept={["image/jpeg", "image/png", "image/webp"]}
                        maxSize={MAX_FILE_SIZE}
                        label="Arrastra una foto aquí para analizar"
                        sublabel="JPEG (mejor), PNG o WebP — Todo se procesa localmente"
                        accentColor={ACCENT}
                        currentImage={imagePreview}
                        onClear={handleClear}
                    />
                </div>

                {isAnalyzing && (
                    <div className="text-center py-8">
                        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        <p className="text-sm text-neutral-400">Analizando metadatos...</p>
                    </div>
                )}

                {error && (
                    <div role="alert" className="mb-4 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm">
                        ⚠️ {error}
                    </div>
                )}

                {nota && !isAnalyzing && (
                    <p role="status" className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-neutral-300">
                        {nota}
                    </p>
                )}

                {/* Risk Score */}
                {riskScore !== null && (
                    <div className="mb-6 bg-white/5 rounded-xl p-4 border border-white/10">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-white">Exposición de privacidad</h3>
                            <span className={`text-sm font-bold ${riskScore >= 60 ? "text-red-400" : riskScore >= 30 ? "text-yellow-400" : "text-green-400"}`}>
                                {riskScore}%
                            </span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${riskScore >= 60 ? "bg-red-500" : riskScore >= 30 ? "bg-yellow-500" : "bg-green-500"
                                    }`}
                                style={{ width: `${riskScore}%` }}
                            />
                        </div>
                        {gpsData && (
                            <p className="text-xs text-red-400 mt-2">
                                <strong>Atención:</strong> esta imagen incluye coordenadas GPS precisas.
                            </p>
                        )}
                    </div>
                )}

                {/* GPS Coordinates */}
                {gpsData && (
                    <div className="mb-6 bg-red-500/10 rounded-xl p-4 border border-red-500/30">
                        <h3 className="text-sm font-semibold text-red-300 mb-3">Coordenadas GPS detectadas</h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="bg-black/20 rounded-lg p-3">
                                <span className="text-xs text-neutral-500 block">Latitud</span>
                                <span className="text-white font-mono">{gpsData.latitude.toFixed(6)}</span>
                            </div>
                            <div className="bg-black/20 rounded-lg p-3">
                                <span className="text-xs text-neutral-500 block">Longitud</span>
                                <span className="text-white font-mono">{gpsData.longitude.toFixed(6)}</span>
                            </div>
                            {gpsData.altitude !== undefined && (
                                <div className="bg-black/20 rounded-lg p-3">
                                    <span className="text-xs text-neutral-500 block">Altitud</span>
                                    <span className="text-white font-mono">{gpsData.altitude.toFixed(1)}m</span>
                                </div>
                            )}
                        </div>
                        <a
                            href={`https://www.openstreetmap.org/?mlat=${gpsData.latitude}&mlon=${gpsData.longitude}#map=16/${gpsData.latitude}/${gpsData.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-lg bg-red-500/20 text-red-300 text-sm hover:bg-red-500/30 transition-colors"
                        >
                            Abrir en OpenStreetMap
                        </a>
                    </div>
                )}

                {/* EXIF Data Table */}
                {exifData && Object.keys(exifData).length > 0 && (
                    <div className="mb-6 bg-white/5 rounded-xl p-4 border border-white/10">
                        <h3 className="text-sm font-semibold text-white mb-3">
                            Metadatos Encontrados ({Object.keys(exifData).length})
                        </h3>
                        <div className="space-y-1">
                            {Object.entries(exifData).map(([key, value]) => (
                                <div
                                    key={key}
                                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/5 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-neutral-400">{key}</span>
                                        {getRiskBadge(key)}
                                    </div>
                                    <span className="text-sm text-white font-mono truncate max-w-[50%] text-right">
                                        {formatearValor(key, value)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Clean Image Button */}
                {imageFile && (
                    <div className="space-y-3">
                        {!limpia ? (
                            <button
                                type="button"
                                onClick={handleClean}
                                disabled={isAnalyzing || limpiando}
                                className="w-full py-3 rounded-xl font-medium text-white transition-all hover:scale-[1.005] disabled:opacity-50"
                                style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT}CC)` }}
                            >
                                {limpiando ? "Limpiando..." : "Limpiar imagen y eliminar metadatos"}
                            </button>
                        ) : (
                            <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/30">
                                <div className="flex items-center justify-between gap-3">
                                    <div role="status">
                                        <p className="text-sm font-medium text-green-300">Imagen limpia lista</p>
                                        <p className="text-xs text-neutral-400 mt-1">
                                            {limpia.resumen}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleDownloadClean}
                                        className="min-h-11 shrink-0 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                                        style={{ background: `${ACCENT}40` }}
                                    >
                                        Descargar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* How it works */}
                <div className="mt-8 bg-white/5 rounded-xl p-4 border border-white/10">
                    <h3 className="text-sm font-semibold text-white mb-3">Qué puede revelar una imagen</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-neutral-400">
                        <div className="flex flex-col items-center text-center gap-2 p-3 rounded-lg bg-white/5">
                            <span className="text-2xl">📍</span>
                            <p><strong className="text-white">Ubicación GPS</strong><br />Coordenadas y altitud del lugar de captura</p>
                        </div>
                        <div className="flex flex-col items-center text-center gap-2 p-3 rounded-lg bg-white/5">
                            <span className="text-2xl">📱</span>
                            <p><strong className="text-white">Dispositivo</strong><br />Modelo, software y ajustes de cámara</p>
                        </div>
                        <div className="flex flex-col items-center text-center gap-2 p-3 rounded-lg bg-white/5">
                            <span className="text-2xl">🗓️</span>
                            <p><strong className="text-white">Fecha y autoría</strong><br />Hora de captura, copyright o nombre del propietario</p>
                        </div>
                    </div>
                </div>

                {/* Security Notice */}
                <div className="mt-4 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                    <p className="text-xs text-amber-300">
                        <strong>Privacidad local:</strong> Todo se procesa en tu navegador y la imagen no se sube a ningún servidor.
                        Puedes revisar los metadatos y descargar una copia limpia desde la misma página.
                    </p>
                </div>

                <div className="mt-8 text-center">
                    <Link href={"/herramientas" as Route} className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Volver a herramientas
                    </Link>
                </div>
            </main>
        </div>
    );
}

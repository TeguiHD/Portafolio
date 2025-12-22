"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

interface RichTextEditorProps {
    content: string;
    onChange: (html: string) => void;
    placeholder?: string;
    minHeight?: string;
}

export function RichTextEditor({
    content,
    onChange,
    placeholder = "Escribe aquí...",
    minHeight = "150px",
}: RichTextEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [3] },
            }),
            Placeholder.configure({
                placeholder,
            }),
        ],
        content,
        immediatelyRender: false, // Prevent SSR hydration mismatch
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: "prose prose-sm prose-invert max-w-none focus:outline-none",
                style: `min-height: ${minHeight}`,
            },
        },
    });

    if (!editor) return null;

    return (
        <div className="border border-white/10 rounded-xl overflow-hidden bg-white/5">
            {/* Toolbar */}
            <div className="flex items-center gap-1 p-2 border-b border-white/10 bg-white/5">
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={`p-1.5 rounded transition-colors ${editor.isActive("bold")
                        ? "bg-purple-500/30 text-purple-300"
                        : "text-neutral-400 hover:text-white hover:bg-white/10"
                        }`}
                    title="Negrita"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
                        <path d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
                    </svg>
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={`p-1.5 rounded transition-colors ${editor.isActive("italic")
                        ? "bg-purple-500/30 text-purple-300"
                        : "text-neutral-400 hover:text-white hover:bg-white/10"
                        }`}
                    title="Cursiva"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path d="M19 4h-9M14 20H5M15 4L9 20" />
                    </svg>
                </button>
                <div className="w-px h-4 bg-white/10 mx-1" />
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={`p-1.5 rounded transition-colors ${editor.isActive("bulletList")
                        ? "bg-purple-500/30 text-purple-300"
                        : "text-neutral-400 hover:text-white hover:bg-white/10"
                        }`}
                    title="Lista"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
                    </svg>
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    className={`p-1.5 rounded transition-colors ${editor.isActive("heading", { level: 3 })
                        ? "bg-purple-500/30 text-purple-300"
                        : "text-neutral-400 hover:text-white hover:bg-white/10"
                        }`}
                    title="Subtítulo"
                >
                    <span className="text-xs font-bold">H3</span>
                </button>
            </div>
            {/* Editor */}
            <EditorContent editor={editor} className="p-4" />
        </div>
    );
}

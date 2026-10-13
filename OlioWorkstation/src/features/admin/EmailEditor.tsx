import { useEffect } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import type { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
export function EmailEditor({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
}) {
  const editor = useEditor({
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        underline: false,
        link: { openOnClick: false, protocols: ['https', 'http', 'mailto'] },
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-label': 'Email message',
        'aria-multiline': 'true',
        class:
          'min-h-72 bg-white p-6 text-slate-800 leading-7 outline-none [&_ul]:list-disc [&_ol]:list-decimal [&_li]:ml-6 [&_a]:text-blue-700 [&_a]:underline [&_p]:mb-3',
      },
    },
    onUpdate: ({ editor }: { editor: Editor }) => onChange(editor.getHTML()),
  });
  useEffect(() => { editor?.setEditable(!disabled); }, [editor, disabled]);
  useEffect(() => {
    if (editor && editor.getHTML() !== value)
      editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);
  if (!editor) return null;
  const toolbar =
    'rounded px-3 py-1.5 text-sm hover:bg-white/10 aria-pressed:bg-blue-500/25';
  return (
    <div className="overflow-hidden rounded-xl border border-white/15 bg-slate-950/40">
      <div
        role="toolbar"
        aria-label="Message formatting"
        className="flex flex-wrap gap-1 border-b border-white/10 p-2"
      >
        <button
          type="button"
          className={toolbar}
          aria-pressed={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleMark('bold').run()}
        >
          Bold
        </button>
        <button
          type="button"
          className={toolbar}
          aria-pressed={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleMark('italic').run()}
        >
          Italic
        </button>
        <button
          type="button"
          className={toolbar}
          aria-pressed={editor.isActive('bulletList')}
          onClick={() =>
            editor.chain().focus().toggleList('bulletList', 'listItem').run()
          }
        >
          Bullets
        </button>
        <button
          type="button"
          className={toolbar}
          aria-pressed={editor.isActive('orderedList')}
          onClick={() =>
            editor.chain().focus().toggleList('orderedList', 'listItem').run()
          }
        >
          Numbered list
        </button>
        <button
          type="button"
          className={toolbar}
          onClick={() => {
            const href = window.prompt(
              'Link address (https://, http://, or mailto:)',
              editor.getAttributes('link').href || 'https://',
            );
            if (href === '') editor.chain().focus().unsetLink().run();
            else if (href && /^(https?:\/\/|mailto:)/i.test(href))
              editor
                .chain()
                .focus()
                .extendMarkRange('link')
                .setLink({ href })
                .run();
          }}
        >
          Link
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

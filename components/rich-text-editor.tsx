'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { Bold, Italic, List, ListOrdered, Link2, Heading1, Heading2, Heading3, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { ImageUpload } from '@/components/ImageUpload'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const [showImageDialog, setShowImageDialog] = useState(false)
  
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg my-4',
        },
      }),
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none min-h-[200px] px-3 py-2 focus:outline-none [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_p]:text-foreground',
      },
    },
  })

  if (!editor) {
    return null
  }

  const setLink = () => {
    const url = window.prompt('Enter URL:')
    if (url) {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }

  const handleImageUpload = (url: string) => {
    editor.chain().focus().setImage({ src: url }).run()
    setShowImageDialog(false)
  }

  return (
    <>
      <div className="border border-border rounded-md">
        {/* Toolbar */}
        <div className="flex flex-wrap gap-1 p-2 border-b border-border bg-muted/30">
        <Button
          type="button"
          size="sm"
          variant={editor.isActive('heading', { level: 1 }) ? 'default' : 'ghost'}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant={editor.isActive('heading', { level: 2 }) ? 'default' : 'ghost'}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant={editor.isActive('heading', { level: 3 }) ? 'default' : 'ghost'}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button
          type="button"
          size="sm"
          variant={editor.isActive('bold') ? 'default' : 'ghost'}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant={editor.isActive('italic') ? 'default' : 'ghost'}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button
          type="button"
          size="sm"
          variant={editor.isActive('bulletList') ? 'default' : 'ghost'}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant={editor.isActive('orderedList') ? 'default' : 'ghost'}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button
          type="button"
          size="sm"
          variant={editor.isActive('link') ? 'default' : 'ghost'}
          onClick={setLink}
        >
          <Link2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setShowImageDialog(true)}
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />
    </div>

    {/* Image Upload Dialog */}
    <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ladda upp bild</DialogTitle>
          <DialogDescription>
            Välj en bild att ladda upp och infoga i texten
          </DialogDescription>
        </DialogHeader>
        <ImageUpload
          bucket="news-images"
          currentImageUrl=""
          onUploadComplete={handleImageUpload}
          hidePreview
        />
      </DialogContent>
    </Dialog>
  </>
  )
}

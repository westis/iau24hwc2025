"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link2,
  Heading1,
  Heading2,
  Heading3,
  ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { NewsImageUpload } from "@/components/news/NewsImageUpload";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
}: RichTextEditorProps) {
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showImageEditDialog, setShowImageEditDialog] = useState(false);
  const [editingImageWidth, setEditingImageWidth] = useState("100%");
  const [selectedImagePos, setSelectedImagePos] = useState<number | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline",
        },
      }),
      Image.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            style: {
              default: null,
              parseHTML: (element) => element.getAttribute("style"),
              renderHTML: (attributes) => {
                if (!attributes.style) {
                  return {};
                }
                return { style: attributes.style };
              },
            },
            width: {
              default: null,
              parseHTML: (element) => element.getAttribute("width"),
              renderHTML: (attributes) => {
                if (!attributes.width) {
                  return {};
                }
                return { width: attributes.width };
              },
            },
          };
        },
      }).configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          class: "h-auto rounded-lg my-4",
        },
      }),
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none min-h-[200px] px-3 py-2 focus:outline-none [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_p]:text-foreground [&_img]:max-w-full [&_img]:h-auto [&_img]:cursor-pointer [&_img]:mx-auto [&_img]:block [&_img]:hover:ring-2 [&_img]:hover:ring-primary [&_img]:transition-all",
      },
      handleClickOn: (view, pos, node, nodePos, event) => {
        if (node.type.name === "image") {
          event.preventDefault();
          const currentStyle = node.attrs.style || "";
          const widthMatch = currentStyle.match(/width:\s*([^;]+)/);
          if (widthMatch) {
            setEditingImageWidth(widthMatch[1].trim());
          }
          setSelectedImagePos(nodePos);
          setShowImageEditDialog(true);
          return true;
        }
        return false;
      },
    },
  });

  if (!editor) {
    return null;
  }

  const setLink = () => {
    const url = window.prompt("Enter URL:");
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const handleImageUpload = (url: string, width?: string) => {
    // Insert image with width and centering styles
    editor
      .chain()
      .focus()
      .setImage({
        src: url,
        style: `width: ${
          width || "100%"
        }; max-width: 100%; height: auto; margin: 1rem auto; display: block;`,
      })
      .run();

    setShowImageDialog(false);
  };

  const handleDeleteImage = () => {
    if (editor && selectedImagePos !== null) {
      const tr = editor.state.tr;
      tr.delete(selectedImagePos, selectedImagePos + 1);
      editor.view.dispatch(tr);
      setShowImageEditDialog(false);
      setSelectedImagePos(null);
    }
  };

  const applyImageWidth = () => {
    if (editor && selectedImagePos !== null) {
      const node = editor.state.doc.nodeAt(selectedImagePos);
      if (node && node.type.name === "image") {
        const tr = editor.state.tr;
        tr.setNodeMarkup(selectedImagePos, undefined, {
          ...node.attrs,
          style: `width: ${editingImageWidth}; max-width: 100%; height: auto; margin: 1rem auto; display: block;`,
        });
        editor.view.dispatch(tr);
        setShowImageEditDialog(false);
        setSelectedImagePos(null);
      }
    }
  };

  return (
    <>
      <div className="border border-border rounded-md">
        {/* Toolbar */}
        <div className="flex flex-wrap gap-1 p-2 border-b border-border bg-muted/30">
          <Button
            type="button"
            size="sm"
            variant={
              editor.isActive("heading", { level: 1 }) ? "default" : "ghost"
            }
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
          >
            <Heading1 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant={
              editor.isActive("heading", { level: 2 }) ? "default" : "ghost"
            }
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
          >
            <Heading2 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant={
              editor.isActive("heading", { level: 3 }) ? "default" : "ghost"
            }
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
          >
            <Heading3 className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-border mx-1" />
          <Button
            type="button"
            size="sm"
            variant={editor.isActive("bold") ? "default" : "ghost"}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant={editor.isActive("italic") ? "default" : "ghost"}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-border mx-1" />
          <Button
            type="button"
            size="sm"
            variant={editor.isActive("bulletList") ? "default" : "ghost"}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant={editor.isActive("orderedList") ? "default" : "ghost"}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-border mx-1" />
          <Button
            type="button"
            size="sm"
            variant={editor.isActive("link") ? "default" : "ghost"}
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Ladda upp bild</DialogTitle>
            <DialogDescription>
              Välj en bild att ladda upp och infoga i artikeln
            </DialogDescription>
          </DialogHeader>
          <NewsImageUpload
            onUploadComplete={handleImageUpload}
            allowCrop={true}
          />
        </DialogContent>
      </Dialog>

      {/* Image Edit Dialog */}
      <Dialog
        open={showImageEditDialog}
        onOpenChange={(open) => {
          setShowImageEditDialog(open);
          if (!open) {
            setSelectedImagePos(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Redigera bild</DialogTitle>
            <DialogDescription>
              Ändra bildbredd eller ta bort bilden
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-image-width">Bildbredd:</Label>
              <Select
                value={editingImageWidth}
                onValueChange={setEditingImageWidth}
              >
                <SelectTrigger id="edit-image-width">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="100%">Full bredd (100%)</SelectItem>
                  <SelectItem value="75%">Stor (75%)</SelectItem>
                  <SelectItem value="50%">Medium (50%)</SelectItem>
                  <SelectItem value="33%">Liten (33%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-between">
              <Button variant="destructive" onClick={handleDeleteImage}>
                Ta bort bild
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowImageEditDialog(false);
                    setSelectedImagePos(null);
                  }}
                >
                  Avbryt
                </Button>
                <Button onClick={applyImageWidth}>Tillämpa</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

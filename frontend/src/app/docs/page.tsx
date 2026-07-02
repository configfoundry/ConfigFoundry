import { getDoc } from '@/lib/docs'
import { DocsContent } from '@/components/docs/DocsContent'

export default function DocsIndexPage() {
  const doc = getDoc('index')
  return <DocsContent title={doc.title} html={doc.html} headings={doc.headings} />
}

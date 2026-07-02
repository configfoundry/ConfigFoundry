import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getDoc, listDocSlugs } from '@/lib/docs'
import { DocsContent } from '@/components/docs/DocsContent'

// Static export: every doc page is pre-rendered at build time from
// docs/*.md. There is no server at runtime to render an unknown slug on
// demand, so dynamicParams is false -- an unrecognized path is simply
// not part of the built site, same as any other static host.
export const dynamicParams = false

export function generateStaticParams() {
  return listDocSlugs().map((slug) => ({ slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  try {
    const doc = getDoc(params.slug)
    return { title: `${doc.title} · ConfigFoundry Docs` }
  } catch {
    return { title: 'ConfigFoundry Docs' }
  }
}

export default function DocSlugPage({ params }: { params: { slug: string } }) {
  let doc
  try {
    doc = getDoc(params.slug)
  } catch {
    notFound()
  }
  return <DocsContent title={doc.title} html={doc.html} headings={doc.headings} />
}

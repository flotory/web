#!/usr/bin/env node
/**
 * One-time migration: replace hardcoded Tailwind palette classes with semantic tokens.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('../resources/js', import.meta.url).pathname

const replacements = [
  // Text
  ['text-slate-950', 'text-ink'],
  ['text-slate-900', 'text-ink'],
  ['text-slate-800', 'text-ink'],
  ['text-slate-700', 'text-ink-muted'],
  ['text-slate-600', 'text-ink-muted'],
  ['text-slate-500', 'text-ink-muted'],
  ['text-slate-400', 'text-ink-soft'],
  ['text-slate-300', 'text-ink-soft'],

  // Backgrounds
  ['hover:bg-slate-800', 'hover:bg-primary-soft'],
  ['bg-slate-950', 'bg-primary'],
  ['bg-slate-900', 'bg-primary'],
  ['bg-slate-800', 'bg-primary-soft'],
  ['hover:bg-slate-100', 'hover:bg-surface-muted'],
  ['hover:bg-slate-50', 'hover:bg-surface-muted'],
  ['bg-slate-100', 'bg-surface-muted'],
  ['bg-slate-50', 'bg-surface-muted'],
  ['bg-white', 'bg-surface'],

  // Borders & rings
  ['border-slate-300', 'border-border'],
  ['border-slate-200', 'border-border'],
  ['ring-slate-950', 'ring-primary'],
  ['ring-slate-300', 'ring-border'],
  ['ring-slate-200', 'ring-border'],

  // Shadows
  ['shadow-slate-950', 'shadow-primary'],
  ['shadow-slate-200', 'shadow-border'],

  // Success (emerald → semantic)
  ['bg-emerald-100', 'bg-success-bg'],
  ['bg-emerald-50', 'bg-success-bg'],
  ['text-emerald-800', 'text-success-text'],
  ['text-emerald-700', 'text-success-text'],
  ['text-emerald-600', 'text-success'],
  ['ring-emerald-500', 'ring-success'],
  ['ring-emerald-200', 'ring-success-border'],
  ['ring-emerald-100', 'ring-success-border'],
  ['border-emerald-200', 'border-success-border'],
  ['border-emerald-100', 'border-success-border'],

  // Accent (amber → semantic)
  ['bg-amber-100', 'bg-accent-soft'],
  ['bg-amber-50', 'bg-accent-soft'],
  ['text-amber-900', 'text-accent-active'],
  ['text-amber-800', 'text-accent-active'],
  ['text-amber-700', 'text-accent-active'],
  ['bg-amber-400', 'bg-accent'],
  ['bg-amber-500', 'bg-accent'],
  ['ring-amber-200', 'ring-accent-border'],
  ['ring-amber-100', 'ring-accent-border'],

  // Brand blue → accent-soft / primary
  ['bg-blue-100', 'bg-accent-soft'],
  ['bg-blue-50', 'bg-accent-soft'],
  ['text-blue-800', 'text-primary'],
  ['text-blue-700', 'text-primary'],
  ['ring-blue-200', 'ring-accent-border'],
  ['ring-blue-100', 'ring-accent-border'],

  // Danger (red → semantic)
  ['bg-red-100', 'bg-danger-soft'],
  ['bg-red-50', 'bg-danger-soft'],
  ['text-red-800', 'text-danger'],
  ['text-red-700', 'text-danger'],
  ['text-red-600', 'text-danger'],
  ['ring-red-300', 'ring-danger/40'],
  ['ring-red-200', 'ring-danger/30'],
  ['border-red-300', 'border-danger/40'],
  ['border-red-200', 'border-danger/30'],

  // Indigo (legacy) → primary / accent
  ['bg-indigo-600', 'bg-primary'],
  ['bg-indigo-500', 'bg-primary'],
  ['bg-indigo-100', 'bg-accent-soft'],
  ['bg-indigo-50', 'bg-accent-soft'],
  ['text-indigo-800', 'text-primary'],
  ['text-indigo-700', 'text-primary'],
  ['text-indigo-600', 'text-primary'],
  ['text-indigo-300', 'text-accent-soft'],
  ['border-indigo-400', 'border-accent'],
  ['border-indigo-300', 'border-accent-border'],
  ['border-indigo-200', 'border-accent-border'],
  ['ring-indigo-400', 'ring-accent'],
  ['ring-indigo-200', 'ring-accent-border'],
  ['shadow-indigo-100', 'shadow-accent-soft'],
  ['from-indigo-500', 'from-primary'],
  ['to-violet-500', 'to-primary-soft'],

  // Subtle borders & focus
  ['border-slate-100', 'border-border'],
  ['focus:border-slate-400', 'focus:border-ink-soft'],
  ['focus-within:border-slate-400', 'focus-within:border-ink-soft'],

  // Gradients
  ['from-slate-950', 'from-primary'],
  ['from-slate-900', 'from-primary'],
  ['via-slate-800', 'via-primary-soft'],
  ['to-slate-900', 'to-primary'],
  ['to-slate-50', 'to-surface-muted'],
  ['from-white', 'from-surface'],

  // Remaining emerald
  ['text-emerald-950', 'text-success-text'],
  ['text-emerald-500', 'text-success'],
  ['from-emerald-50', 'from-success-bg'],
  ['to-emerald-50', 'to-success-bg'],
  ['shadow-emerald-950', 'shadow-primary'],
  ['hover:border-emerald-300', 'hover:border-success-border'],

  // Remaining amber
  ['text-amber-600', 'text-accent-active'],
  ['border-amber-300', 'border-accent-border'],
  ['border-amber-200', 'border-accent-border'],
  ['shadow-amber-100', 'shadow-accent-soft'],
  ['hover:border-amber-300', 'hover:border-accent-border'],

  // Dividers & misc
  ['divide-slate-100', 'divide-border'],
  ['ring-slate-100', 'ring-border'],
  ['bg-slate-200', 'bg-border'],
  ['hover:bg-slate-200', 'hover:bg-border'],
  ['bg-slate-400', 'bg-ink-soft'],
  ['text-slate-100', 'text-primary-text'],
  ['text-slate-200', 'text-primary-text/80'],
  ['text-emerald-900', 'text-success-text'],
  ['text-amber-950', 'text-accent-active'],
  ['text-amber-300', 'text-accent'],
  ['text-blue-600', 'text-primary'],
  ['text-blue-100', 'text-accent-soft'],
  ['text-blue-200', 'text-accent-soft'],
  ['text-indigo-200', 'text-accent-soft'],
  ['text-emerald-300', 'text-success'],
  ['bg-emerald-400', 'bg-success'],
  ['bg-violet-50', 'bg-accent-soft'],
  ['text-violet-600', 'text-primary'],
  ['text-violet-700', 'text-primary'],
  ['ring-violet-100', 'ring-accent-border'],
  ['bg-violet-100', 'bg-accent-soft'],
  ['ring-violet-200', 'ring-accent-border'],
  ['bg-violet-600', 'bg-primary-soft'],
  ['via-violet-600', 'via-primary-soft'],
  ['to-slate-950', 'to-primary'],
  ['to-slate-800', 'to-primary-soft'],
  ['via-slate-900', 'via-primary-soft'],
  ['via-slate-950', 'via-primary'],
  ['border-slate-800', 'border-primary-soft'],
  ['border-slate-900', 'border-primary'],
  ['from-slate-50', 'from-surface-muted'],
  ['via-white', 'via-surface'],
  ['to-white', 'to-surface'],
  ['to-indigo-50', 'to-accent-soft'],
  ['to-indigo-600', 'to-primary-soft'],
  ['to-indigo-950', 'to-primary'],
  ['from-indigo-50', 'from-accent-soft'],
  ['ring-indigo-100', 'ring-accent-border'],
  ['ring-indigo-500', 'ring-accent'],
  ['shadow-indigo-600', 'shadow-primary'],
  ['hover:bg-indigo-700', 'hover:bg-primary-soft'],
  ['bg-indigo-300', 'bg-accent'],
  ['bg-indigo-400', 'bg-accent'],
  ['bg-blue-300', 'bg-accent'],
  ['text-indigo-500', 'text-accent'],
  ['border-emerald-300', 'border-success-border'],
  ['border-slate-800/80', 'border-primary-soft/80'],
]

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    const stat = statSync(path)
    if (stat.isDirectory()) {
      walk(path, files)
    } else if (path.endsWith('.vue') || path.endsWith('.ts')) {
      files.push(path)
    }
  }
  return files
}

let changed = 0
for (const file of walk(root)) {
  let content = readFileSync(file, 'utf8')
  const original = content
  for (const [from, to] of replacements) {
    content = content.split(from).join(to)
  }
  if (content !== original) {
    writeFileSync(file, content)
    changed++
    console.log('updated:', file.replace(root + '/', ''))
  }
}

console.log(`\nDone. ${changed} file(s) updated.`)

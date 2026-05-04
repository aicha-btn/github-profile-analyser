import type { ReadmeAnalysis, ReadmeSignals } from '../types/github'

const EMPTY_SIGNALS: ReadmeSignals = {
  hasImportantSections: false,
  hasInstallation: false,
  hasTechStack: false,
  hasFeatures: false,
  hasScreenshots: false,
  hasDemoLink: false,
  hasFutureImprovements: false,
}

function testPatterns(content: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(content))
}

function getReadmeLevel(score: number): ReadmeAnalysis['level'] {
  if (score >= 8) {
    return 'README professionnel'
  }

  if (score >= 5) {
    return 'README correct'
  }

  return 'README basique'
}

export function createUnavailableReadmeAnalysis(): ReadmeAnalysis {
  return {
    analyzed: false,
    score: 0,
    maxScore: 10,
    level: 'README basique',
    signals: EMPTY_SIGNALS,
  }
}

export function analyzeReadmeContent(content: string | null, homepage: string | null): ReadmeAnalysis {
  if (!content?.trim()) {
    return createUnavailableReadmeAnalysis()
  }

  const normalizedContent = content.toLowerCase()

  const signals: ReadmeSignals = {
    hasImportantSections: testPatterns(normalizedContent, [
      /^#{1,3}\s+(installation|setup|usage|features|fonctionnalit[eé]s|tech stack|stack|roadmap)/im,
      /^#+\s+(about|overview|presentation|pr[eé]sentation)/im,
    ]),
    hasInstallation: testPatterns(normalizedContent, [
      /\binstallation\b/i,
      /\binstall\b/i,
      /\bsetup\b/i,
      /\bgetting started\b/i,
      /\bnpm install\b/i,
      /\byarn install\b/i,
      /\bpnpm install\b/i,
    ]),
    hasTechStack: testPatterns(normalizedContent, [
      /\btech stack\b/i,
      /\btechnologies?\b/i,
      /\bstack\b/i,
      /\bbuilt with\b/i,
      /\breact\b/i,
      /\btypescript\b/i,
    ]),
    hasFeatures: testPatterns(normalizedContent, [
      /\bfeatures?\b/i,
      /\bfonctionnalit[eé]s?\b/i,
      /\bwhat it does\b/i,
      /\bcapabilities\b/i,
    ]),
    hasScreenshots: testPatterns(normalizedContent, [
      /!\[[^\]]*\]\([^)]+\)/i,
      /<img\s/i,
      /\bscreenshot\b/i,
      /\bcapture d['’]écran\b/i,
      /\bpreview\b/i,
    ]),
    hasDemoLink: Boolean(homepage?.trim()) ||
      testPatterns(normalizedContent, [
        /\bdemo\b/i,
        /\blive\b/i,
        /\bdeployment\b/i,
        /https?:\/\/[^\s)]+/i,
      ]),
    hasFutureImprovements: testPatterns(normalizedContent, [
      /\broadmap\b/i,
      /\btodo\b/i,
      /\bnext steps\b/i,
      /\bfuture improvements\b/i,
      /\bam[eé]liorations? futures?\b/i,
      /\bcoming soon\b/i,
    ]),
  }

  const score =
    (signals.hasImportantSections ? 1 : 0) +
    (signals.hasInstallation ? 2 : 0) +
    (signals.hasTechStack ? 2 : 0) +
    (signals.hasFeatures ? 2 : 0) +
    (signals.hasScreenshots ? 1 : 0) +
    (signals.hasDemoLink ? 1 : 0) +
    (signals.hasFutureImprovements ? 1 : 0)

  return {
    analyzed: true,
    score,
    maxScore: 10,
    level: getReadmeLevel(score),
    signals,
  }
}

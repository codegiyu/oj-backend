import mongoose from 'mongoose';

export type RelatedProductCandidate = {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  price: number;
  vendor?: mongoose.Types.ObjectId;
  category?: mongoose.Types.ObjectId | null;
  subCategory?: mongoose.Types.ObjectId | null;
  tags?: string[];
};

export type RelatedProductScoreInput = {
  _id: mongoose.Types.ObjectId;
  name: string;
  price: number;
  vendor?: mongoose.Types.ObjectId;
  category?: mongoose.Types.ObjectId;
  subCategory?: mongoose.Types.ObjectId;
  tags?: string[];
};

function idString(value: mongoose.Types.ObjectId | string | null | undefined): string {
  if (value == null) return '';
  return String(value);
}

function tokenizeName(name: string): Set<string> {
  return new Set(
    name
      .toLowerCase()
      .split(/[^a-z0-9]+/i)
      .map(token => token.trim())
      .filter(token => token.length > 2)
  );
}

function sharedTagCount(a: string[] | undefined, b: string[] | undefined): number {
  if (!a?.length || !b?.length) return 0;

  const normalized = new Set(a.map(tag => tag.toLowerCase().trim()).filter(Boolean));

  return b.filter(tag => normalized.has(tag.toLowerCase().trim())).length;
}

function nameTokenOverlap(a: string, b: string): number {
  const tokensA = tokenizeName(a);
  const tokensB = tokenizeName(b);
  let overlap = 0;

  for (const token of tokensA) {
    if (tokensB.has(token)) overlap += 1;
  }

  return overlap;
}

function isWithinPriceBand(sourcePrice: number, candidatePrice: number, ratio = 0.3): boolean {
  if (sourcePrice <= 0 || candidatePrice <= 0) return false;

  const low = sourcePrice * (1 - ratio);
  const high = sourcePrice * (1 + ratio);

  return candidatePrice >= low && candidatePrice <= high;
}

export function scoreRelatedProduct(
  source: RelatedProductScoreInput,
  candidate: RelatedProductCandidate
): number {
  if (idString(source._id) === idString(candidate._id)) return -1;

  let score = 0;

  if (
    source.subCategory &&
    candidate.subCategory &&
    idString(source.subCategory) === idString(candidate.subCategory)
  ) {
    score += 40;
  } else if (
    source.category &&
    candidate.category &&
    idString(source.category) === idString(candidate.category)
  ) {
    score += 25;
  }

  const tagMatches = sharedTagCount(source.tags, candidate.tags);
  score += Math.min(tagMatches * 10, 30);

  if (source.vendor && candidate.vendor && idString(source.vendor) === idString(candidate.vendor)) {
    score += 15;
  }

  score += Math.min(nameTokenOverlap(source.name, candidate.name) * 5, 20);

  if (isWithinPriceBand(source.price, candidate.price)) {
    score += 10;
  }

  return score;
}

export function rankRelatedProducts(
  source: RelatedProductScoreInput,
  candidates: RelatedProductCandidate[],
  limit: number
): RelatedProductCandidate[] {
  const scored = candidates
    .map(candidate => ({
      candidate,
      score: scoreRelatedProduct(source, candidate),
    }))
    .filter(entry => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.candidate.name.localeCompare(b.candidate.name);
    });

  return scored.slice(0, limit).map(entry => entry.candidate);
}

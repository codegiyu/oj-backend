import { describe, expect, it } from 'vitest';
import { isPubliclyVisible, toPublicArtistAttribution } from '../../src/services/profileVisibility';
import { UNKNOWN_PUBLIC_DISPLAY_NAME } from '../../src/lib/types/roleProfile';

describe('profileVisibility', () => {
  it('hides profile when owner user is suspended', () => {
    expect(
      isPubliclyVisible('artist', { profileStatus: 'active', isActive: true }, { accountStatus: 'suspended' })
    ).toBe(false);
  });

  it('shows active artist when owner is active', () => {
    expect(
      isPubliclyVisible('artist', { profileStatus: 'active', isActive: true }, { accountStatus: 'active' })
    ).toBe(true);
  });

  it('returns Unknown user attribution for suspended artist profile', () => {
    const attr = toPublicArtistAttribution(
      { _id: 'a1', name: 'Real Name', slug: 'real', profileStatus: 'suspended' },
      { accountStatus: 'active' }
    );
    expect(attr?.displayName).toBe(UNKNOWN_PUBLIC_DISPLAY_NAME);
    expect(attr?.linkable).toBe(false);
  });
});

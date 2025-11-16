import * as assert from 'assert';
import { discordOAuthCallback, discordOAuthInitiate } from '../src';

describe('discordOAuth', () => {
  it('should export discordOAuthInitiate function', () => {
    assert.ok(discordOAuthInitiate);
    assert.equal(typeof discordOAuthInitiate, 'function');
  });

  it('should export discordOAuthCallback function', () => {
    assert.ok(discordOAuthCallback);
    assert.equal(typeof discordOAuthCallback, 'function');
  });
});

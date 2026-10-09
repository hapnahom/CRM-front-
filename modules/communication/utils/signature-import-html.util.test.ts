/**
 * @jest-environment jsdom
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  cleanImportedSignatureHtml,
  normalizeSignatureHtmlForEmail,
  prepareEmailBodyHtml,
  rewriteSignatureResourceUrl,
} from './signature-import-html.util';

const fixturePath = path.join(
  __dirname,
  '__fixtures__/outlook-signature-sample.html',
);

describe('signature-import-html.util', () => {
  const outlookHtml = fs.readFileSync(fixturePath, 'utf8');

  describe('rewriteSignatureResourceUrl', () => {
    it('rewrites file-server /download/ to /view/ and encodes +', () => {
      expect(
        rewriteSignatureResourceUrl(
          'https://files.example.com/download/foo+bar.png',
        ),
      ).toBe('https://files.example.com/view/foo%20bar.png');
    });

    it('adds dl=1 to Dropbox share links', () => {
      const out = rewriteSignatureResourceUrl(
        'https://www.dropbox.com/s/abc123/logo.png?dl=0',
      );
      expect(out).toContain('dl=1');
      expect(out).toContain('dropbox.com');
    });

    it('leaves external CDN image URLs untouched', () => {
      const src =
        'https://www.mail-signatures.com/signature-generator/img/templates/other/custom.png';
      expect(rewriteSignatureResourceUrl(src)).toBe(src);
    });

    it('rewrites dead mail-signatures social icons to working favicons', () => {
      const out = rewriteSignatureResourceUrl(
        'https://www.mail-signatures.com/signature-generator/img/templates/all-inclusive/it.png',
      );
      expect(out).toContain('google.com/s2/favicons');
      expect(out).toContain('instagram.com');
    });

    it('rewrites all five all-inclusive social icons', () => {
      const map: Record<string, string> = {
        fb: 'facebook.com',
        ln: 'linkedin.com',
        tt: 'twitter.com',
        yt: 'youtube.com',
        it: 'instagram.com',
      };
      for (const [file, domain] of Object.entries(map)) {
        const out = rewriteSignatureResourceUrl(
          `https://www.mail-signatures.com/signature-generator/img/templates/all-inclusive/${file}.png`,
        );
        expect(out).toContain('google.com/s2/favicons');
        expect(out).toContain(domain);
      }
    });

    it('leaves Dropbox content URLs mostly intact', () => {
      const src =
        'https://dl.dropboxusercontent.com/s/syxewjck0mkzvhc/Primary%20new1.png';
      expect(rewriteSignatureResourceUrl(src)).toBe(src);
    });
  });

  describe('prepareEmailBodyHtml', () => {
    it('adds referrerpolicy and strips Outlook data-imagetype on banners', () => {
      const input =
        '<img data-imagetype="External" src="https://ienetworks.co/pms/uploads/email/Email-Signature-Banner_V02.jpg" alt="Banner" width="400" style="width:400px; height:auto; box-sizing:border-box">';
      const out = prepareEmailBodyHtml(input);
      expect(out).toMatch(/referrerpolicy="no-referrer"/i);
      expect(out).not.toMatch(/data-imagetype/i);
      expect(out).toContain(
        'https://ienetworks.co/pms/uploads/email/Email-Signature-Banner_V02.jpg',
      );
    });

    it('does not duplicate referrerpolicy', () => {
      const input =
        '<img referrerpolicy="origin" src="https://example.com/a.png" alt="">';
      const out = prepareEmailBodyHtml(input);
      expect(out.match(/referrerpolicy=/gi)?.length).toBe(1);
      expect(out).toContain('referrerpolicy="origin"');
    });

    it('repairs collapsed favicons.png social icons from alt text', () => {
      const input = [
        '<img src="https://files.ienetworks.co/view/test/uuid/favicons.png" alt="Facebook" width="15" height="15">',
        '<img src="https://files.ienetworks.co/view/test/uuid/favicons.png" alt="Instagram" width="15" height="15">',
      ].join('');
      const out = prepareEmailBodyHtml(input);
      expect(out).toContain('domain=facebook.com');
      expect(out).toContain('domain=instagram.com');
      expect(out).not.toMatch(/favicons\.png/i);
    });
  });

  describe('cleanImportedSignatureHtml (Outlook sample)', () => {
    it('strips Fluent/Outlook chrome without dropping the signature table', () => {
      const cleaned = cleanImportedSignatureHtml(outlookHtml, {
        autoClean: true,
      });
      expect(cleaned).toMatch(/<table\b/i);
      expect(cleaned).not.toMatch(/fui-Button/i);
      expect(cleaned).not.toMatch(/Show original size/i);
      expect(cleaned).not.toMatch(/data-cursor-element-id/i);
      expect(cleaned).not.toMatch(/\bR1UVb\b/);
    });

    it('preserves logo height=36 and style height:36px', () => {
      const cleaned = cleanImportedSignatureHtml(outlookHtml, {
        autoClean: true,
      });
      const host = document.createElement('div');
      host.innerHTML = cleaned;
      const logo = Array.from(host.querySelectorAll('img')).find((img) =>
        (img.getAttribute('alt') || '').toLowerCase().includes('logo'),
      );
      expect(logo).toBeTruthy();
      expect(logo!.getAttribute('height')).toBe('36');
      const style = logo!.getAttribute('style') || '';
      expect(style).toMatch(/height\s*:\s*36px/i);
      expect(style).not.toMatch(/width\s*:\s*200px/i);
    });

    it('preserves social icon width/height 15', () => {
      const cleaned = cleanImportedSignatureHtml(outlookHtml, {
        autoClean: true,
      });
      const host = document.createElement('div');
      host.innerHTML = cleaned;
      const icons = Array.from(host.querySelectorAll('img')).filter((img) => {
        const w = img.getAttribute('width');
        const h = img.getAttribute('height');
        return w === '15' && h === '15';
      });
      expect(icons.length).toBeGreaterThanOrEqual(4);
      icons.forEach((img) => {
        const style = img.getAttribute('style') || '';
        expect(style).toMatch(/width\s*:\s*15px/i);
        expect(style).toMatch(/height\s*:\s*15px/i);
      });
    });

    it('preserves link colors and text-decoration:none', () => {
      const cleaned = cleanImportedSignatureHtml(outlookHtml, {
        autoClean: true,
      });
      const host = document.createElement('div');
      host.innerHTML = cleaned;
      const links = Array.from(host.querySelectorAll('a'));
      expect(links.length).toBeGreaterThan(0);
      const styled = links.filter((a) => {
        const s = a.getAttribute('style') || '';
        return /color\s*:/i.test(s) && /text-decoration\s*:\s*none/i.test(s);
      });
      expect(styled.length).toBeGreaterThan(0);
      styled.forEach((a) => {
        expect(a.getAttribute('target')).toBe('_blank');
        expect(a.getAttribute('rel')).toMatch(/noopener/i);
        // Inline color must remain (rgb or hex).
        expect(a.getAttribute('style')).toMatch(/color\s*:/i);
      });
    });

    it('preserves table cellspacing/cellpadding and td width styles', () => {
      const cleaned = cleanImportedSignatureHtml(outlookHtml, {
        autoClean: true,
      });
      const host = document.createElement('div');
      host.innerHTML = cleaned;
      const table = host.querySelector('table');
      expect(table).toBeTruthy();
      expect(table!.getAttribute('cellspacing')).toBe('0');
      expect(table!.getAttribute('cellpadding')).toBe('0');
      const tableStyle = table!.getAttribute('style') || '';
      expect(tableStyle).toMatch(/width\s*:\s*400px/i);
      const td = host.querySelector('td[style*="259px"], td[style*="259"]');
      expect(td).toBeTruthy();
    });
  });

  describe('normalizeSignatureHtmlForEmail', () => {
    it('does not force default dimensions onto sized images', () => {
      const input = `<img src="https://www.mail-signatures.com/x.png" width="15" height="15" style="width:15px; height:15px;" alt="icon">`;
      const out = normalizeSignatureHtmlForEmail(input);
      const host = document.createElement('div');
      host.innerHTML = out;
      const img = host.querySelector('img')!;
      expect(img.getAttribute('width')).toBe('15');
      expect(img.getAttribute('height')).toBe('15');
      expect(img.getAttribute('style')).toMatch(/width\s*:\s*15px/i);
      expect(img.getAttribute('style')).toMatch(/height\s*:\s*15px/i);
      expect(img.getAttribute('style')).not.toMatch(/200px/);
    });

    it('preserves !important link colors through normalize', () => {
      const input = `<a href="https://example.com" style="color: rgb(70, 186, 236) !important; text-decoration: none;">site</a>`;
      const out = normalizeSignatureHtmlForEmail(input);
      expect(out).toMatch(/text-decoration:\s*none/i);
      expect(out).toMatch(/color:\s*rgb\(70,\s*186,\s*236\)/i);
      expect(out).toMatch(/target="_blank"/i);
    });

    it('round-trips Outlook import → clean → normalize without resizing', () => {
      const cleaned = cleanImportedSignatureHtml(outlookHtml, {
        autoClean: true,
      });
      const normalized = normalizeSignatureHtmlForEmail(cleaned);
      const host = document.createElement('div');
      host.innerHTML = normalized;
      const logo = Array.from(host.querySelectorAll('img')).find((img) =>
        (img.getAttribute('alt') || '').toLowerCase().includes('logo'),
      );
      expect(logo!.getAttribute('height')).toBe('36');
      expect(logo!.getAttribute('style') || '').toMatch(/height\s*:\s*36px/i);
      const fifteen = Array.from(host.querySelectorAll('img')).filter(
        (img) => img.getAttribute('width') === '15',
      );
      expect(fifteen.length).toBeGreaterThanOrEqual(4);
      // Dead mail-signatures.com icons rewritten to working favicons.
      const iconSrcs = fifteen.map((img) => img.getAttribute('src') || '');
      expect(iconSrcs.every((s) => s.includes('google.com/s2/favicons'))).toBe(
        true,
      );
      expect(normalized).not.toMatch(
        /mail-signatures\.com.*\/(fb|ln|tt|yt|it)\.png/i,
      );
    });
  });
});

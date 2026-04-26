/* Readrrr Browser Extension - Background Service Worker */

importScripts('mercury-parser.js');

(function() {
  'use strict';

  // Default settings
  const DEFAULT_SETTINGS = {
    apiUrl: 'https://api.readrrr.app',
    apiKey: ''
  };

  // Message handlers
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    (async () => {
      try {
        switch (request.action) {
          case 'extractArticle':
            const article = await extractArticle(request.url);
            sendResponse({ success: true, article });
            break;

          case 'readNow':
            const readResult = await saveAndRead(request.article, request.settings);
            sendResponse({ success: true, documentId: readResult.documentId });
            break;

          case 'saveForLater':
            const saveResult = await saveDocument(request.article, request.settings);
            sendResponse({ success: true, documentId: saveResult.documentId });
            break;

          default:
            sendResponse({ success: false, error: 'Unknown action' });
        }
      } catch (error) {
        console.error('Background script error:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();

    return true; // Keep message channel open for async
  });

  /**
   * Extract article content using Mercury Parser
   */
  async function extractArticle(url) {
    try {
      // Fetch the page content
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const html = await response.text();

      // Use Mercury Parser
      if (typeof Mercury !== 'undefined') {
        const result = await Mercury.parse(url, {
          html,
          contentType: 'text'
        });

        return {
          title: result.title || 'Untitled',
          author: result.author || '',
          content: cleanContent(result.content || ''),
          excerpt: result.excerpt || '',
          url: result.url || url,
          wordCount: result.word_count || estimateWordCount(result.content),
          publishedDate: result.date_published || ''
        };
      } else {
        // Fallback: basic extraction
        return {
          title: extractTitleFromHtml(html),
          author: '',
          content: extractTextFromHtml(html),
          excerpt: '',
          url: url,
          wordCount: 0,
          publishedDate: ''
        };
      }
    } catch (error) {
      console.error('Mercury extraction failed:', error);
      throw error;
    }
  }

  /**
   * Save document and return document ID for reading
   */
  async function saveAndRead(article, settings) {
    const saved = await saveDocument(article, settings);
    
    // Mark as currently reading (optional API call)
    try {
      await fetch(`${settings.apiUrl}/v1/documents/${saved.documentId}/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.apiKey}`
        }
      });
    } catch (error) {
      console.warn('Failed to mark as reading:', error);
    }

    return saved;
  }

  /**
   * Save document to Readrrr
   */
  async function saveDocument(article, settings) {
    const payload = {
      title: article.title,
      author: article.author,
      content: article.content,
      sourceUrl: article.url,
      excerpt: article.excerpt,
      wordCount: article.wordCount,
      metadata: {
        extractedAt: new Date().toISOString(),
        publishedDate: article.publishedDate
      }
    };

    try {
      const response = await fetch(`${settings.apiUrl}/v1/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.apiKey}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`API error: ${response.status} - ${error}`);
      }

      const result = await response.json();
      return { documentId: result.id || result.documentId };
    } catch (error) {
      console.error('Save document failed:', error);
      throw error;
    }
  }

  /**
   * Clean extracted content
   */
  function cleanContent(content) {
    if (!content) return '';

    return content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Estimate word count from text
   */
  function estimateWordCount(text) {
    if (!text) return 0;
    return text.split(/\s+/).filter(w => w.length > 0).length;
  }

  /**
   * Extract title from HTML (fallback)
   */
  function extractTitleFromHtml(html) {
    const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    return match ? match[1].trim() : 'Untitled';
  }

  /**
   * Extract text from HTML (fallback)
   */
  function extractTextFromHtml(html) {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Handle extension installation
  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
      // Set default settings
      chrome.storage.sync.set(DEFAULT_SETTINGS);
      console.log('Readrrr extension installed');
    }
  });
})();

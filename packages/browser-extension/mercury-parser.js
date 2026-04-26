/**
 * Readrrr Browser Extension - Mercury Parser Wrapper
 * 
 * This is a lightweight wrapper around Mercury Parser for browser extension use.
 * In production, this would bundle the @jocmp/mercury-parser package.
 * 
 * For MVP, we include a minimal parsing implementation.
 */

(function(global) {
  'use strict';

  const Mercury = {
    /**
     * Parse a URL or HTML content
     * @param {string} url - URL to parse
     * @param {Object} options - Parsing options
     * @returns {Promise<Object>} - Parsed article data
     */
    async parse(url, options = {}) {
      const { html, contentType = 'html' } = options;

      try {
        // If HTML is provided, parse it directly
        // Otherwise, fetch the URL
        const content = html || await this.fetchPage(url);
        
        // Parse the content
        const result = this.extractArticle(content, url);
        
        // Convert content type if needed
        if (contentType === 'text') {
          result.content = this.htmlToText(result.content);
        }

        return {
          title: result.title,
          author: result.author,
          content: result.content,
          excerpt: result.excerpt,
          url: url,
          word_count: this.countWords(result.content),
          date_published: result.datePublished,
          domain: this.extractDomain(url)
        };
      } catch (error) {
        console.error('Mercury parse error:', error);
        throw error;
      }
    },

    /**
     * Fetch page content
     */
    async fetchPage(url) {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.text();
    },

    /**
     * Extract article data from HTML
     */
    extractArticle(html, url) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Extract title
      const title = this.extractTitle(doc);

      // Extract author
      const author = this.extractAuthor(doc);

      // Extract date published
      const datePublished = this.extractDatePublished(doc);

      // Extract main content
      const content = this.extractContent(doc);

      // Generate excerpt
      const excerpt = this.generateExcerpt(content);

      return {
        title,
        author,
        content,
        excerpt,
        datePublished
      };
    },

    /**
     * Extract title from document
     */
    extractTitle(doc) {
      // Try Open Graph title first
      const ogTitle = doc.querySelector('meta[property="og:title"]');
      if (ogTitle) {
        return ogTitle.getAttribute('content') || '';
      }

      // Try article title
      const articleTitle = doc.querySelector('meta[property="article:title"]');
      if (articleTitle) {
        return articleTitle.getAttribute('content') || '';
      }

      // Use document title
      return doc.title || 'Untitled';
    },

    /**
     * Extract author from document
     */
    extractAuthor(doc) {
      const selectors = [
        'meta[name="author"]',
        'meta[property="article:author"]',
        'meta[property="og:author"]',
        '.author',
        '.byline',
        '[rel="author"]',
        '.writer',
        '.post-author'
      ];

      for (const selector of selectors) {
        const el = doc.querySelector(selector);
        if (el) {
          const content = el.getAttribute('content');
          const text = el.textContent;
          if (content) return content;
          if (text) return text.trim();
        }
      }

      return '';
    },

    /**
     * Extract publication date
     */
    extractDatePublished(doc) {
      const selectors = [
        'meta[property="article:published_time"]',
        'meta[name="datePublished"]',
        'meta[name="publish_date"]',
        'meta[property="og:published_time"]',
        'time[datetime]',
        '.published',
        '.date-published',
        '.post-date'
      ];

      for (const selector of selectors) {
        const el = doc.querySelector(selector);
        if (el) {
          const content = el.getAttribute('content') ||
                         el.getAttribute('datetime') ||
                         el.textContent;
          if (content) return content.trim();
        }
      }

      return '';
    },

    /**
     * Extract main content from document
     */
    extractContent(doc) {
      // Content selectors in order of preference
      const selectors = [
        'article',
        '[role="main"]',
        'main',
        '.article',
        '.post-content',
        '.entry-content',
        '.content',
        '#content',
        '.post',
        '.story',
        '.entry'
      ];

      let contentElement = null;

      for (const selector of selectors) {
        contentElement = doc.querySelector(selector);
        if (contentElement) break;
      }

      // Fallback to body
      if (!contentElement) {
        contentElement = doc.body;
      }

      if (!contentElement) {
        return '';
      }

      // Clone to avoid modifying original
      const clone = contentElement.cloneNode(true);

      // Remove unwanted elements
      const unwanted = clone.querySelectorAll(
        'script, style, nav, header, footer, aside, .sidebar, .comments, ' +
        '.related, .ads, .advertisement, .social, .share, iframe, button, form, ' +
        'input, select, textarea, .newsletter, .subscribe'
      );
      unwanted.forEach(el => el.remove());

      return clone.innerHTML || '';
    },

    /**
     * Generate excerpt from content
     */
    generateExcerpt(content, maxLength = 200) {
      const text = this.htmlToText(content);
      if (text.length <= maxLength) return text;
      
      // Try to end at a sentence
      const truncated = text.substring(0, maxLength);
      const lastSentence = truncated.match(/^.*[.!?]/);
      
      if (lastSentence) {
        return lastSentence[0];
      }
      
      // Fallback to word boundary
      const lastSpace = truncated.lastIndexOf(' ');
      if (lastSpace > 0) {
        return truncated.substring(0, lastSpace) + '...';
      }
      
      return truncated + '...';
    },

    /**
     * Convert HTML to plain text
     */
    htmlToText(html) {
      if (!html) return '';

      // Create temporary element
      const temp = document.createElement('div');
      temp.innerHTML = html;

      // Get text content
      let text = temp.textContent || temp.innerText || '';

      // Clean up whitespace
      return text
        .replace(/\s+/g, ' ')
        .replace(/\n+/g, '\n')
        .trim();
    },

    /**
     * Count words in text
     */
    countWords(text) {
      if (!text) return 0;
      const words = text.trim().split(/\s+/);
      return words.filter(w => w.length > 0).length;
    },

    /**
     * Extract domain from URL
     */
    extractDomain(url) {
      try {
        const urlObj = new URL(url);
        return urlObj.hostname;
      } catch {
        return '';
      }
    }
  };

  // Expose to global scope
  global.Mercury = Mercury;

})(typeof self !== 'undefined' ? self : this);

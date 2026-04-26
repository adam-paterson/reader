/* Readrrr Browser Extension - Content Script */

(function() {
  'use strict';

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extract') {
      const content = extractPageContent();
      sendResponse({ content });
    }
    return true; // Keep message channel open for async
  });

  /**
   * Extract readable content from the current page
   * Uses heuristics to find the main content area
   */
  function extractPageContent() {
    // Try to find the main article content
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
      '.story'
    ];

    let contentElement = null;

    // Try each selector
    for (const selector of selectors) {
      contentElement = document.querySelector(selector);
      if (contentElement) break;
    }

    // Fallback: use body if no specific content area found
    if (!contentElement) {
      contentElement = document.body;
    }

    // Extract text content
    let text = '';
    
    if (contentElement) {
      // Clone to avoid modifying the actual page
      const clone = contentElement.cloneNode(true);
      
      // Remove unwanted elements
      const unwantedSelectors = [
        'script',
        'style',
        'nav',
        'header',
        'footer',
        'aside',
        '.sidebar',
        '.comments',
        '.related',
        '.ads',
        '.advertisement',
        'iframe',
        'button',
        'form',
        'input',
        'select',
        'textarea'
      ];
      
      unwantedSelectors.forEach(selector => {
        const elements = clone.querySelectorAll(selector);
        elements.forEach(el => el.remove());
      });

      // Get text content
      text = clone.innerText || clone.textContent || '';
    }

    // Clean up the text
    return cleanText(text);
  }

  /**
   * Clean and normalize extracted text
   */
  function cleanText(text) {
    if (!text) return '';

    return text
      // Replace multiple whitespace with single space
      .replace(/\s+/g, ' ')
      // Remove leading/trailing whitespace
      .trim()
      // Fix common HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  // Also expose a method for extracting metadata
  function extractMetadata() {
    return {
      title: document.title || '',
      url: window.location.href,
      author: extractAuthor(),
      publishedDate: extractPublishedDate(),
      description: extractDescription()
    };
  }

  function extractAuthor() {
    // Try common author meta tags and selectors
    const authorSelectors = [
      'meta[name="author"]',
      'meta[property="article:author"]',
      '.author',
      '.byline',
      '[rel="author"]'
    ];

    for (const selector of authorSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        return el.getAttribute('content') || 
               el.getAttribute('href') || 
               el.innerText || 
               '';
      }
    }

    return '';
  }

  function extractPublishedDate() {
    const dateSelectors = [
      'meta[property="article:published_time"]',
      'meta[name="datePublished"]',
      'time[datetime]',
      '.published',
      '.date'
    ];

    for (const selector of dateSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        return el.getAttribute('content') || 
               el.getAttribute('datetime') || 
               el.innerText || 
               '';
      }
    }

    return '';
  }

  function extractDescription() {
    const meta = document.querySelector('meta[name="description"]') ||
                 document.querySelector('meta[property="og:description"]');
    return meta ? meta.getAttribute('content') || '' : '';
  }

  // Make metadata extraction available
  window.readrrrExtractMetadata = extractMetadata;
})();

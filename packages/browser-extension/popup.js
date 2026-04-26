/* Readrrr Browser Extension - Popup Script */

;(function () {
  "use strict"

  // DOM Elements
  const loadingEl = document.getElementById("loading")
  const contentEl = document.getElementById("content")
  const articleInfoEl = document.getElementById("article-info")
  const articleTitleEl = document.getElementById("article-title")
  const articleMetaEl = document.getElementById("article-meta")
  const errorMessageEl = document.getElementById("error-message")
  const btnReadNow = document.getElementById("btn-read-now")
  const btnSaveLater = document.getElementById("btn-save-later")
  const btnSettings = document.getElementById("btn-settings")
  const settingsPanelEl = document.getElementById("settings-panel")
  const btnSaveSettings = document.getElementById("btn-save-settings")
  const btnCancelSettings = document.getElementById("btn-cancel-settings")
  const apiUrlInput = document.getElementById("api-url")
  const apiKeyInput = document.getElementById("api-key")

  // State
  let currentArticle = null
  let settings = {
    apiUrl: "https://api.readrrr.app",
    apiKey: "",
  }

  // Initialize
  document.addEventListener("DOMContentLoaded", init)

  async function init() {
    loadSettings()
    setupEventListeners()
    await extractArticle()
  }

  function setupEventListeners() {
    btnReadNow.addEventListener("click", handleReadNow)
    btnSaveLater.addEventListener("click", handleSaveLater)
    btnSettings.addEventListener("click", showSettings)
    btnSaveSettings.addEventListener("click", saveSettings)
    btnCancelSettings.addEventListener("click", hideSettings)
  }

  async function loadSettings() {
    try {
      const result = await chrome.storage.sync.get(["apiUrl", "apiKey"])
      if (result.apiUrl) settings.apiUrl = result.apiUrl
      if (result.apiKey) settings.apiKey = result.apiKey

      apiUrlInput.value = settings.apiUrl
      apiKeyInput.value = settings.apiKey
    } catch (error) {
      console.error("Failed to load settings:", error)
    }
  }

  async function saveSettings() {
    settings.apiUrl = apiUrlInput.value.trim() || "https://api.readrrr.app"
    settings.apiKey = apiKeyInput.value.trim()

    try {
      await chrome.storage.sync.set(settings)
      hideSettings()
    } catch (error) {
      console.error("Failed to save settings:", error)
      alert("Failed to save settings. Please try again.")
    }
  }

  function showSettings() {
    settingsPanelEl.classList.remove("hidden")
    contentEl.classList.add("hidden")
  }

  function hideSettings() {
    settingsPanelEl.classList.add("hidden")
    contentEl.classList.remove("hidden")
  }

  async function extractArticle() {
    showLoading()

    try {
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

      if (!tab || !tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("about:")) {
        showError("Cannot extract content from this page.")
        return
      }

      // Send message to background script for Mercury parsing
      const response = await chrome.runtime.sendMessage({
        action: "extractArticle",
        url: tab.url,
        html: null, // Will be fetched by background script
      })

      if (response.success && response.article) {
        currentArticle = response.article
        showArticleInfo(currentArticle)
      } else {
        // Fallback: try content script extraction
        const fallbackResponse = await chrome.tabs.sendMessage(tab.id, { action: "extract" })

        if (fallbackResponse && fallbackResponse.content) {
          currentArticle = {
            title: tab.title || "Untitled",
            content: fallbackResponse.content,
            url: tab.url,
            wordCount: fallbackResponse.content.split(/\s+/).length,
          }
          showArticleInfo(currentArticle)
        } else {
          showError()
        }
      }
    } catch (error) {
      console.error("Extraction error:", error)
      showError()
    }
  }

  function showLoading() {
    loadingEl.classList.remove("hidden")
    articleInfoEl.classList.add("hidden")
    errorMessageEl.classList.add("hidden")
    btnReadNow.disabled = true
    btnSaveLater.disabled = true
  }

  function showArticleInfo(article) {
    loadingEl.classList.add("hidden")
    articleInfoEl.classList.remove("hidden")

    articleTitleEl.textContent = article.title || "Untitled"

    const author = article.author ? `by ${article.author}` : ""
    const wordCount = article.wordCount || article.word_count || 0
    const readTime = Math.ceil(wordCount / 200) // Assuming 200 WPM

    articleMetaEl.textContent = `${author}${author ? " • " : ""}${wordCount} words • ${readTime} min read`

    btnReadNow.disabled = false
    btnSaveLater.disabled = false
  }

  function showError(message) {
    loadingEl.classList.add("hidden")
    errorMessageEl.classList.remove("hidden")
    if (message) {
      errorMessageEl.querySelector("p").textContent = message
    }
  }

  async function handleReadNow() {
    if (!currentArticle) return

    btnReadNow.disabled = true
    btnReadNow.textContent = "Opening..."

    try {
      // Send to Readrrr and open RSVP reader
      const response = await chrome.runtime.sendMessage({
        action: "readNow",
        article: currentArticle,
        settings: settings,
      })

      if (response.success) {
        // Open Readrrr in new tab
        const readUrl = `${settings.apiUrl.replace("/api", "")}/read/${response.documentId}`
        await chrome.tabs.create({ url: readUrl })
        window.close()
      } else {
        throw new Error(response.error || "Failed to start reading")
      }
    } catch (error) {
      console.error("Read now error:", error)
      alert("Failed to start RSVP reading. Please check your settings and try again.")
      btnReadNow.disabled = false
      btnReadNow.textContent = "📖 Read Now (RSVP)"
    }
  }

  async function handleSaveLater() {
    if (!currentArticle) return

    btnSaveLater.disabled = true
    btnSaveLater.textContent = "Saving..."

    try {
      const response = await chrome.runtime.sendMessage({
        action: "saveForLater",
        article: currentArticle,
        settings: settings,
      })

      if (response.success) {
        btnSaveLater.textContent = "✓ Saved!"
        setTimeout(() => window.close(), 1500)
      } else {
        throw new Error(response.error || "Failed to save")
      }
    } catch (error) {
      console.error("Save error:", error)
      alert("Failed to save article. Please check your settings and try again.")
      btnSaveLater.disabled = false
      btnSaveLater.textContent = "🔖 Save for Later"
    }
  }
})()

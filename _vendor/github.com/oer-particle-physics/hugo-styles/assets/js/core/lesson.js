(() => {
  const root = document.documentElement;
  const viewStorageKey = "hugo-styles:view";
  const lessonSidebarStorageKey = "hugo-styles:lesson-sidebar-collapsed";
  const lessonTocStorageKey = "hugo-styles:lesson-toc-collapsed";
  const allowedViews = new Set(["learner", "instructor"]);
  const lessonShells = Array.from(document.querySelectorAll("[data-lesson-shell]"));
  const floatingBackToTopButtons = Array.from(document.querySelectorAll("[data-lesson-back-to-top]"));
  const desktopTocMedia = window.matchMedia("(min-width: 1280px)");

  const readPreference = (key) => {
    try {
      return window.localStorage.getItem(key);
    } catch (_) {
      return null;
    }
  };

  const savePreference = (key, value) => {
    try {
      window.localStorage.setItem(key, value);
    } catch (_) {
      // The current page still works when storage is disabled or unavailable.
    }
  };

  const initEpisodeProgress = () => {
    const scope = document.querySelector('meta[name="lesson-progress-scope"]')?.content;
    const markers = new Map();
    const content = document.querySelector("[data-episode-content]");
    const path = content?.dataset.episodeContent;
    if (!scope) {
      return;
    }

    const storageScope = encodeURIComponent(scope);
    const storagePrefix = `hugo-styles:episode-progress:${storageScope}:`;
    const resetKey = `hugo-styles:episode-progress-reset:${storageScope}`;
    let resetToken = null;
    const readProgress = (path) => {
      try {
        const record = JSON.parse(readPreference(storagePrefix + path));
        const percent = record?.percent;
        if ((record?.resetToken ?? null) === resetToken && Number.isInteger(percent) && percent >= 0 && percent <= 100) {
          return {
            percent,
            section: typeof record.section === "string" ? record.section : "",
            visitedAt: Number.isFinite(record.visitedAt) ? record.visitedAt : 0,
          };
        }
      } catch (_) {
        // A malformed record can be replaced as the learner reads.
      }
      return { percent: 0, visitedAt: 0, section: "" };
    };

    document.querySelectorAll("[data-episode-progress]").forEach((marker) => {
      const path = marker.dataset.episodeProgress;
      if (!markers.has(path)) {
        markers.set(path, []);
      }
      markers.get(path).push(marker);
    });

    const resumeLinks = document.querySelectorAll("[data-episode-resume]");
    const resumePaths = JSON.parse(document.querySelector('meta[name="lesson-progress-episodes"]')?.content ?? "[]");
    const paths = new Set([...markers.keys(), ...resumePaths]);
    if (path) {
      paths.add(path);
    }
    const resetButton = document.querySelector("[data-episode-progress-reset]");
    if (paths.size === 0 && !resetButton) {
      return;
    }

    const wideNavigation = window.matchMedia("(min-width: 1024px)");
    const mobileNavigation = window.matchMedia("(max-width: 767px)");
    const mobileMenuToggle = document.querySelector(".hextra-hamburger-menu");
    const navigationResume = Array.from(document.querySelectorAll("template[data-episode-resume-placement]"), (template) => {
      const placement = template.dataset.episodeResumePlacement;
      const item = template.content.firstElementChild.cloneNode(true);
      const link = placement === "navbar" ? item : item.querySelector("a");
      const dropdown = placement === "dropdown"
        ? template.parentElement
        : template.previousElementSibling?.querySelector(".hextra-nav-menu-items");
      const toggle = placement === "mobile" ? mobileMenuToggle : dropdown?.previousElementSibling;
      link.addEventListener("click", () => {
        if (link.pathname !== window.location.pathname) {
          return;
        }
        // The audience control may have changed the query since this link was rendered.
        link.search = window.location.search;
        if (placement !== "navbar" && toggle?.getAttribute("aria-expanded") === "true") {
          toggle.click();
        }
      });
      return { placement, template, item, link, toggle };
    });

    const progressByPath = new Map();
    const setProgress = (path, record) => {
      const previous = progressByPath.get(path);
      progressByPath.set(path, record);
      const { percent } = record;
      if (percent === previous?.percent) {
        return;
      }

      for (const marker of markers.get(path) || []) {
        marker.style.setProperty("--episode-progress", `${percent}%`);
        marker.querySelector("[data-episode-progress-value]").textContent = `${percent}%`;
        marker.setAttribute("aria-label", percent === 100 ? "Complete" : `${percent}% reached`);
        marker.toggleAttribute("data-complete", percent === 100);
        marker.hidden = false;
      }
    };

    const refreshResume = () => {
      const records = resumePaths.map((path) => progressByPath.get(path));
      let lastVisited = -1;
      let lastVisitTime = 0;
      records.forEach(({ visitedAt }, index) => {
        if (visitedAt > lastVisitTime) {
          lastVisited = index;
          lastVisitTime = visitedAt;
        }
      });

      let target = lastVisited;
      if (target !== -1 && records[target].percent === 100) {
        target = records.findIndex(({ percent }, index) => index > lastVisited && percent < 100);
        if (target === -1) {
          target = records.findIndex(({ percent }) => percent < 100);
        }
      }

      let href = "";
      if (target !== -1) {
        const targetPath = resumePaths[target];
        const search = targetPath === window.location.pathname ? window.location.search : "";
        const { section } = records[target];
        href = targetPath + search + (section ? `#${encodeURIComponent(section)}` : "");
      }
      for (const link of resumeLinks) {
        link.hidden = !href;
        if (href) {
          link.setAttribute("href", href);
        }
      }

      const activePlacement = wideNavigation.matches ? "navbar" : mobileNavigation.matches ? "mobile" : "dropdown";
      const focusedResume = navigationResume.find(({ link }) => link === document.activeElement);
      for (const { placement, template, item, link } of navigationResume) {
        if (href && placement === activePlacement) {
          link.setAttribute("href", href);
          if (!item.parentElement) {
            template.after(item);
          }
        } else {
          // Hextra includes every dropdown menuitem in its arrow-key navigation.
          item.remove();
        }
      }
      if (focusedResume && !focusedResume.item.isConnected) {
        const replacement = navigationResume.find(({ placement }) => placement === activePlacement);
        const link = replacement?.link;
        const linkVisible = link?.getClientRects().length && getComputedStyle(link).visibility === "visible";
        const focusTarget = linkVisible ? link : replacement?.toggle;
        focusTarget?.focus({ preventScroll: true });
      }
    };
    wideNavigation.addEventListener("change", refreshResume);
    mobileNavigation.addEventListener("change", refreshResume);

    const refreshProgress = () => {
      resetToken = readPreference(resetKey);
      for (const path of paths) {
        setProgress(path, readProgress(path));
      }
      refreshResume();
    };
    refreshProgress();

    if (resetButton) {
      const status = document.querySelector("[data-episode-progress-reset-status]");
      const clearSavedProgress = (storage) => {
        for (const key of Object.keys(storage)) {
          if (key.startsWith(storagePrefix)) {
            storage.removeItem(key);
          }
        }
      };
      resetButton.hidden = false;
      resetButton.addEventListener("click", () => {
        if (!window.confirm("Reset all progress for this lesson version in this browser?")) {
          return;
        }

        try {
          const storage = window.localStorage;
          const token = window.crypto.getRandomValues(new Uint32Array(4)).join("-");
          try {
            storage.setItem(resetKey, token);
          } catch (error) {
            if (error.name !== "QuotaExceededError") {
              throw error;
            }
            clearSavedProgress(storage);
            storage.setItem(resetKey, token);
          }
          // Remove any progress an open tab saved before the token was written.
          clearSavedProgress(storage);
          status.textContent = "Progress reset.";
        } catch (_) {
          status.textContent = "Could not reset progress in this browser.";
        }
        refreshProgress();
      });
    }

    window.addEventListener("pageshow", ({ persisted }) => {
      if (persisted) {
        refreshProgress();
      }
    });
    window.addEventListener("storage", ({ key }) => {
      if (key === null || key === resetKey) {
        refreshProgress();
        return;
      }

      if (key.startsWith(storagePrefix)) {
        const changedPath = key.slice(storagePrefix.length);
        if (paths.has(changedPath)) {
          setProgress(changedPath, readProgress(changedPath));
          refreshResume();
        }
      }
    });

    if (!content) {
      return;
    }

    const headings = Array.from(content.querySelectorAll("h2, h3, h4, h5, h6"), (heading) => ({
      heading,
      // Hextra puts Markdown heading anchors on an offset span inside the heading.
      id: heading.id || heading.querySelector(":scope > span[id]")?.id,
    })).filter(({ id }) => id);
    const navbar = document.querySelector(".hextra-nav-container");
    let frame = 0;
    let trackSection = false;
    let trackingResetToken = resetToken;

    const currentSection = () => {
      const readingLine = (navbar?.getBoundingClientRect().bottom || 0) + 32;
      let section = "";
      for (const { heading, id } of headings) {
        const { top, height } = heading.getBoundingClientRect();
        if (height > 0 && top <= readingLine) {
          section = id;
        }
      }
      return section;
    };

    const saveProgress = (nextProgress) => {
      // A reset can happen before this tab receives its storage event.
      if (trackingResetToken !== readPreference(resetKey)) {
        return;
      }
      const progress = { ...nextProgress, visitedAt: Date.now() };
      savePreference(storagePrefix + path, JSON.stringify({ ...progress, resetToken: trackingResetToken }));
      setProgress(path, progress);
      refreshResume();
    };

    const recordVisit = () => {
      const progress = progressByPath.get(path);
      if (progress.percent < 100) {
        saveProgress(progress);
      }
    };

    const updateProgress = () => {
      frame = 0;
      const { bottom, height } = content.getBoundingClientRect();
      const progress = progressByPath.get(path);
      const updateSection = trackSection;
      trackSection = false;
      if (height <= 0 || progress.percent === 100) {
        return;
      }
      const remaining = (bottom - window.innerHeight) / height;
      const reached = Math.max(0, 100 - Math.ceil(Math.max(0, remaining) * 100));
      const section = updateSection && reached < 100 ? currentSection() : progress.section;
      if (reached <= progress.percent && section === progress.section) {
        return;
      }

      const saved = readProgress(path);
      saveProgress({
        percent: Math.max(reached, saved.percent, progress.percent),
        section: updateSection || progress.visitedAt > saved.visitedAt ? section : saved.section,
      });
    };

    const scheduleUpdate = () => {
      if (!frame) {
        frame = requestAnimationFrame(updateProgress);
      }
    };

    const measureInitialPosition = () => {
      trackSection ||= Boolean(window.location.hash);
      scheduleUpdate();
    };
    recordVisit();
    if (document.readyState === "complete") {
      measureInitialPosition();
    }
    window.addEventListener("pageshow", ({ persisted }) => {
      if (persisted) {
        recordVisit();
        scheduleUpdate();
      } else {
        measureInitialPosition();
      }
    });
    const resumeTracking = (event) => {
      if (event.isTrusted) {
        trackingResetToken = resetToken;
      }
    };
    for (const event of ["pointerdown", "keydown", "wheel"]) {
      window.addEventListener(event, resumeTracking, { passive: true });
    }
    window.addEventListener("scroll", () => {
      trackSection = true;
      scheduleUpdate();
    }, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("pagehide", () => {
      if (frame) {
        cancelAnimationFrame(frame);
        updateProgress();
      }
    });
  };

  const scrollToTop = () => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scroll({
      top: 0,
      left: 0,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  };

  const syncFloatingBackToTop = () => {
    if (floatingBackToTopButtons.length === 0) {
      return;
    }

    const shouldShow = lessonShells.some((shell) => {
      const tocHidden = shell.dataset.tocCollapsed === "true" || !desktopTocMedia.matches;
      return tocHidden && window.scrollY > 300;
    });

    floatingBackToTopButtons.forEach((button) => {
      button.dataset.visible = shouldShow ? "true" : "false";
      button.tabIndex = shouldShow ? 0 : -1;
    });
  };
  const syncViewUrl = (view) => {
    const url = new URL(window.location.href);
    if (view === "learner") {
      url.searchParams.delete("view");
    } else {
      url.searchParams.set("view", view);
    }
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  };

  const applyView = (view) => {
    const next = allowedViews.has(view) ? view : "learner";
    root.dataset.view = next;
    document.querySelectorAll("[data-view-toggle]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.viewToggle === next));
    });
  };

  applyView(root.dataset.view || "learner");

  document.querySelectorAll("[data-view-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const next = button.dataset.viewToggle || "learner";
      savePreference(viewStorageKey, next);
      applyView(next);
      syncViewUrl(next);
    });
  });

  document.querySelectorAll("[data-expand-solutions]").forEach((button) => {
    button.addEventListener("click", () => {
      const details = document.querySelectorAll("[data-lesson-disclosure='solution'], [data-lesson-disclosure='hint']");
      const shouldOpen = button.dataset.expanded !== "true";
      details.forEach((item) => {
        item.open = shouldOpen;
      });
      button.dataset.expanded = String(shouldOpen);
      button.textContent = shouldOpen ? "Collapse Hints and Solutions" : "Expand Hints and Solutions";
    });
  });

  const applyLessonToggleState = (kind, collapsed) => {
    const next = collapsed ? "true" : "false";
    const pressed = collapsed ? "false" : "true";
    const attribute = kind === "sidebar" ? "sidebarCollapsed" : "tocCollapsed";
    const buttonSelector = kind === "sidebar" ? "[data-lesson-sidebar-toggle]" : "[data-lesson-toc-toggle]";
    const collapsedLabel = kind === "sidebar" ? "Show lesson menu" : "Show on this page panel";
    const expandedLabel = kind === "sidebar" ? "Hide lesson menu" : "Hide on this page panel";
    const collapsedAria = kind === "sidebar" ? "Show lesson menu" : "Show on this page panel";
    const expandedAria = kind === "sidebar" ? "Hide lesson menu" : "Hide on this page panel";

    lessonShells.forEach((shell) => {
      shell.dataset[attribute] = next;
    });

    document.querySelectorAll(buttonSelector).forEach((button) => {
      button.setAttribute("aria-pressed", pressed);
      button.setAttribute("aria-label", collapsed ? collapsedAria : expandedAria);
      button.setAttribute("title", collapsed ? collapsedLabel : expandedLabel);
    });

    syncFloatingBackToTop();
  };

  document.querySelectorAll("[data-aio-search]").forEach((input) => {
    input.addEventListener("input", () => {
      const query = input.value.trim().toLowerCase();
      document.querySelectorAll("[data-aio-episode]").forEach((episode) => {
        const haystack = `${episode.dataset.title || ""} ${episode.textContent || ""}`.toLowerCase();
        episode.style.display = !query || haystack.includes(query) ? "" : "none";
      });
    });
  });

  floatingBackToTopButtons.forEach((button) => {
    button.addEventListener("click", scrollToTop);
  });

  if (lessonShells.length > 0) {
    const sidebarFromStorage = readPreference(lessonSidebarStorageKey);
    const tocFromStorage = readPreference(lessonTocStorageKey);
    applyLessonToggleState("sidebar", sidebarFromStorage === "true");
    applyLessonToggleState("toc", tocFromStorage === "true");

    document.querySelectorAll("[data-lesson-sidebar-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        const shell = button.closest("[data-lesson-shell]");
        const collapsed = shell?.dataset.sidebarCollapsed !== "true";
        savePreference(lessonSidebarStorageKey, String(collapsed));
        applyLessonToggleState("sidebar", collapsed);
      });
    });

    document.querySelectorAll("[data-lesson-toc-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        const shell = button.closest("[data-lesson-shell]");
        const collapsed = shell?.dataset.tocCollapsed !== "true";
        savePreference(lessonTocStorageKey, String(collapsed));
        applyLessonToggleState("toc", collapsed);
      });
    });
  }

  document.addEventListener("scroll", syncFloatingBackToTop, { passive: true });
  desktopTocMedia.addEventListener("change", syncFloatingBackToTop);
  syncFloatingBackToTop();
  initEpisodeProgress();
})();

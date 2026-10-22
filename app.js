(() => {
  const $ = (id) => document.getElementById(id);
  const state = { format: "vertical", cues: [], currentCue: 0, previewTimer: null, previewPlaying: false, previewStart: 0, duration: 0 };
  const SAMPLE_SCRIPT = "Boring does not mean worthless. Some of the most useful businesses solve problems nobody wants to deal with. Clean messy data. Organize documents. Build clear processes. Boring problem. Real service.";
  const SAMPLE_SRT = `1\n00:00:00,000 --> 00:00:02,200\nBoring does not mean worthless.\n\n2\n00:00:02,200 --> 00:00:04,500\nSome businesses solve ignored problems.\n\n3\n00:00:04,500 --> 00:00:07,000\nClean messy data. Organize documents.\n\n4\n00:00:07,000 --> 00:00:09,200\nBuild clear processes.\n\n5\n00:00:09,200 --> 00:00:11,500\nBoring problem. Real service.`;
  const SCENE_TYPES = [
    { name: "CINEMATIC HOOK", kicker: "THE PROBLEM", visual: "bars" },
    { name: "KINETIC TYPOGRAPHY", kicker: "MAKE IT CLEAR", visual: "type" },
    { name: "VISUAL EXPLANATION", kicker: "THE SYSTEM", visual: "diagram" },
    { name: "DRAMATIC EMPHASIS", kicker: "REMEMBER THIS", visual: "impact" },
    { name: "CLOSING STATEMENT", kicker: "THE TAKEAWAY", visual: "outro" }
  ];

  function parseTimestamp(value) {
    const match = value.trim().match(/^(?:(\d{1,2}):)?(\d{2}):(\d{2})[,.](\d{1,3})$/);
    if (!match) return NaN;
    return (Number(match[1] || 0) * 3600) + Number(match[2]) * 60 + Number(match[3]) + Number((match[4] + "00").slice(0, 3)) / 1000;
  }
  function parseSrt(text) {
    const blocks = text.replace(/\r/g, "").trim().split(/\n\s*\n/);
    const cues = [];
    for (const block of blocks) {
      const lines = block.split("\n").map(x => x.trim()).filter(Boolean);
      const timeIndex = lines.findIndex(x => x.includes("-->"));
      if (timeIndex < 0) continue;
      const times = lines[timeIndex].split("-->");
      if (times.length !== 2) continue;
      const start = parseTimestamp(times[0]);
      const end = parseTimestamp(times[1].split(/\s+/)[0]);
      const caption = lines.slice(timeIndex + 1).join(" ").replace(/<[^>]*>/g, "").trim();
      if (Number.isFinite(start) && Number.isFinite(end) && end > start && caption) cues.push({ start, end, text: caption });
    }
    return cues.sort((a,b) => a.start - b.start);
  }
  function timeLabel(seconds) {
    const s = Math.max(0, Math.floor(seconds || 0));
    return `${String(Math.floor(s / 60)).padStart(2,"0")}:${String(s % 60).padStart(2,"0")}`;
  }
  function sceneForCue(cue, index, count) {
    const text = cue.text;
    if (index === 0) return 0;
    if (index === count - 1) return 4;
    if (/\d|%|\$|first|second|third|step|process|because|compare|versus|vs\.?/i.test(text)) return 2;
    if (text.length < 34 || /!|never|stop|remember|important|real|not |instead/i.test(text)) return 3;
    return 1;
  }
  function setCue(index) {
    if (!state.cues.length) return;
    state.currentCue = ((index % state.cues.length) + state.cues.length) % state.cues.length;
    const cue = state.cues[state.currentCue];
    const type = SCENE_TYPES[sceneForCue(cue, state.currentCue, state.cues.length)];
    const words = cue.text.split(/\s+/);
    const pivot = Math.max(1, Math.ceil(words.length * .55));
    const first = words.slice(0, pivot).join(" ");
    const second = words.slice(pivot).join(" ");
    $("sceneKicker").textContent = type.kicker;
    $("sceneTitle").innerHTML = "";
    const firstSpan = document.createElement("span");
    firstSpan.textContent = first;
    $("sceneTitle").appendChild(firstSpan);
    if (second) {
      $("sceneTitle").appendChild(document.createElement("br"));
      const em = document.createElement("em");
      em.textContent = second;
      $("sceneTitle").appendChild(em);
    }
    $("sceneCaption").textContent = state.cues.length > 1 ? `Scene ${String(state.currentCue + 1).padStart(2,"0")} / ${String(state.cues.length).padStart(2,"0")}` : "Your subtitles guide each scene.";
    $("sceneNumber").textContent = `SCENE ${String(state.currentCue + 1).padStart(2,"0")}`;
    $("sceneType").textContent = type.name;
    $("previewCaption").textContent = cue.text;
    $("previewCaption").classList.toggle("hidden", !$("captionsToggle").checked);
    $("previewTime").textContent = timeLabel(cue.start);
    $("previewTrackFill").style.width = `${state.duration ? (cue.start / state.duration) * 100 : 0}%`;
    $("sceneVisual").className = `scene-visual visual-${type.visual}`;
    $("previewScene").style.animation = "none";
    void $("previewScene").offsetWidth;
    $("previewScene").style.animation = "sceneEnter .65s cubic-bezier(.16,1,.3,1) both";
  }
  function updateValidation() {
    const script = $("scriptInput").value.trim();
    $("scriptCount").textContent = `${script.length} characters`;
    const file = $("srtInput").files[0];
    if (!file) {
      $("validationBox").className = "validation";
      $("validationText").textContent = "Add a script and SRT file to validate your project.";
      return;
    }
    file.text().then(text => {
      const cues = parseSrt(text);
      state.cues = cues;
      state.duration = cues.length ? cues[cues.length - 1].end : 0;
      if (!script || !cues.length) {
        $("validationBox").className = "validation bad";
        $("validationText").textContent = !script ? "Paste your script before generating." : "The SRT could not be parsed. Check the timestamp format.";
        return;
      }
      $("validationBox").className = "validation good";
      $("validationText").textContent = `${cues.length} subtitle cues found · last subtitle at ${timeLabel(state.duration)}. The uploaded audio may be longer; the renderer checks its duration.`;
      setCue(0);
    }).catch(() => {
      $("validationBox").className = "validation bad";
      $("validationText").textContent = "Could not read the SRT file.";
    });
  }
  function loadSample() {
    $("scriptInput").value = SAMPLE_SCRIPT;
    const blob = new Blob([SAMPLE_SRT], { type: "text/plain" });
    const file = new File([blob], "motion-forge-sample.srt", { type: "text/plain" });
    const transfer = new DataTransfer(); transfer.items.add(file); $("srtInput").files = transfer.files;
    $("srtName").textContent = file.name;
    updateValidation();
    $("renderStatus").classList.add("hidden");
  }
  function openSettings() {
    $("settingsModal").classList.remove("hidden");
    $("rendererUrl").value = localStorage.getItem("mf_renderer_url") || "";
    $("rendererToken").value = localStorage.getItem("mf_renderer_token") || "";
    $("connectionResult").textContent = "";
  }
  function closeSettings() { $("settingsModal").classList.add("hidden"); }
  function saveSettings() {
    localStorage.setItem("mf_renderer_url", $("rendererUrl").value.trim().replace(/\/+$/, ""));
    localStorage.setItem("mf_renderer_token", $("rendererToken").value.trim());
    $("connectionResult").className = "connection-result success";
    $("connectionResult").textContent = "Saved on this browser. You can now try a short render.";
  }
  async function testConnection() {
    const url = $("rendererUrl").value.trim().replace(/\/+$/, "");
    const token = $("rendererToken").value.trim();
    const result = $("connectionResult");
    result.className = "connection-result"; result.textContent = "Testing renderer…";
    if (!url) { result.className = "connection-result error"; result.textContent = "Enter the renderer base URL first."; return; }
    try {
      const res = await fetch(`${url}/health`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const data = await res.json();
      if (!res.ok || data.status !== "ok") throw new Error(data.error || `HTTP ${res.status}`);
      result.className = "connection-result success"; result.textContent = "Renderer is reachable. HyperFrames: " + (data.renderer || "ready") + ".";
    } catch (err) {
      result.className = "connection-result error";
      result.textContent = `Connection failed: ${err.message}. Check URL, token, CORS and whether the renderer is running.`;
    }
  }
  function showStatus(title, message, percent = 0, spinning = true) {
    $("renderStatus").classList.remove("hidden");
    $("statusTitle").textContent = title;
    $("statusMessage").textContent = message;
    $("statusPercent").textContent = percent ? `${percent}%` : "";
    $("progressFill").style.width = `${percent}%`;
    $("statusSpinner").classList.toggle("hidden", !spinning);
  }
  async function generate() {
    const script = $("scriptInput").value.trim();
    const audio = $("audioInput").files[0];
    const srt = $("srtInput").files[0];
    if (!script || !audio || !srt) {
      showStatus("Missing inputs", "Please provide a script, voiceover audio and SRT subtitles.", 0, false);
      return;
    }
    const cues = parseSrt(await srt.text());
    if (!cues.length) { showStatus("Invalid SRT", "No valid subtitle cues were found. Check your SRT timestamps.", 0, false); return; }
    const baseUrl = (localStorage.getItem("mf_renderer_url") || "").replace(/\/+$/, "");
    const token = localStorage.getItem("mf_renderer_token") || "";
    if (!baseUrl) {
      showStatus("Renderer not connected", "The website preview works, but MP4 rendering requires a separate HyperFrames renderer. Open Renderer settings and connect it first.", 0, false);
      openSettings();
      return;
    }
    $("generateButton").disabled = true;
    $("downloadLink").classList.add("hidden");
    showStatus("Uploading project", "Sending your files to the configured renderer.", 8, true);
    try {
      const form = new FormData();
      form.append("script", script);
      form.append("voiceover", audio, audio.name);
      form.append("srt", srt, srt.name);
      form.append("format", state.format);
      form.append("sfx", $("sfxToggle").checked ? "true" : "false");
      form.append("captions", $("captionsToggle").checked ? "true" : "false");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await fetch(`${baseUrl}/api/render`, { method: "POST", headers, body: form });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || `Renderer returned ${response.status}`);
      const jobId = payload.jobId;
      if (!jobId) throw new Error("Renderer did not return a job ID.");
      await pollJob(baseUrl, token, jobId);
    } catch (err) {
      showStatus("Render failed", err.message || "Could not reach the renderer. Check the URL, token, CORS and renderer logs.", 0, false);
    } finally {
      $("generateButton").disabled = false;
    }
  }
  async function pollJob(baseUrl, token, jobId) {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    let lastStatus = "";
    for (let i = 0; i < 900; i++) {
      const response = await fetch(`${baseUrl}/api/jobs/${encodeURIComponent(jobId)}`, { headers });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Job status returned ${response.status}`);
      const percent = Math.max(8, Math.min(95, Number(data.progress || 0)));
      if (data.status !== lastStatus) {
        lastStatus = data.status;
        showStatus(data.status === "completed" ? "Render complete" : data.status === "failed" ? "Render failed" : "Rendering video", data.message || "HyperFrames is processing your video.", data.status === "completed" ? 100 : percent, !["completed","failed"].includes(data.status));
      } else {
        $("statusPercent").textContent = `${percent}%`;
        $("progressFill").style.width = `${percent}%`;
      }
      if (data.status === "completed") {
        const link = `${baseUrl}/api/jobs/${encodeURIComponent(jobId)}/download`;
        const downloadResponse = await fetch(link, { headers });
        if (!downloadResponse.ok) throw new Error("The render completed, but the MP4 download failed. Try generating again.");
        const videoBlob = await downloadResponse.blob();
        const blobUrl = URL.createObjectURL(videoBlob);
        $("downloadLink").href = blobUrl;
        $("downloadLink").download = "motion-forge-video.mp4";
        $("downloadLink").classList.remove("hidden");
        $("statusMessage").textContent = "Your MP4 is ready. Tap Download MP4 to save the finished video.";
        $("statusSpinner").classList.add("hidden");
        return;
      }
      if (data.status === "failed") throw new Error(data.error || "The renderer failed.");
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    throw new Error("This render is taking longer than expected. Check the renderer status and try again if needed.");
  }
  function togglePreview() {
    if (!state.cues.length) {
      state.cues = parseSrt(SAMPLE_SRT);
      state.duration = state.cues[state.cues.length - 1].end;
      setCue(0);
    }
    if (state.previewPlaying) {
      clearInterval(state.previewTimer); state.previewPlaying = false;
      $("previewPlay").textContent = "▶"; return;
    }
    state.previewPlaying = true; state.previewStart = Date.now();
    $("previewPlay").textContent = "Ⅱ";
    state.previewTimer = setInterval(() => {
      const elapsed = (Date.now() - state.previewStart) / 1000;
      const duration = state.duration || 11.5;
      const current = Math.min(duration, elapsed);
      $("previewTime").textContent = timeLabel(current);
      $("previewTrackFill").style.width = `${Math.min(100, current / duration * 100)}%`;
      const cueIndex = state.cues.findIndex(c => current >= c.start && current < c.end);
      if (cueIndex >= 0 && cueIndex !== state.currentCue) setCue(cueIndex);
      if (current >= duration) {
        clearInterval(state.previewTimer); state.previewPlaying = false; $("previewPlay").textContent = "▶";
      }
    }, 100);
  }
  function setFormat(format) {
    state.format = format;
    document.querySelectorAll(".format-option").forEach(btn => btn.classList.toggle("selected", btn.dataset.format === format));
    $("previewStage").classList.toggle("landscape-stage", format === "landscape");
    $("previewRatio").textContent = format === "vertical" ? "9:16" : "16:9";
  }

  $("scriptInput").addEventListener("input", updateValidation);
  $("audioInput").addEventListener("change", () => {
    $("audioName").textContent = $("audioInput").files[0]?.name || "No file selected";
  });
  $("srtInput").addEventListener("change", () => {
    $("srtName").textContent = $("srtInput").files[0]?.name || "No file selected";
    updateValidation();
  });
  $("captionsToggle").addEventListener("change", () => $("previewCaption").classList.toggle("hidden", !$("captionsToggle").checked));
  document.querySelectorAll(".format-option").forEach(btn => btn.addEventListener("click", () => setFormat(btn.dataset.format)));
  $("loadSample").addEventListener("click", loadSample);
  $("settingsOpen").addEventListener("click", openSettings);
  $("settingsClose").addEventListener("click", closeSettings);
  $("settingsModal").addEventListener("click", e => { if (e.target === $("settingsModal")) closeSettings(); });
  $("saveSettings").addEventListener("click", saveSettings);
  $("testConnection").addEventListener("click", testConnection);
  $("generateButton").addEventListener("click", generate);
  $("previewPlay").addEventListener("click", togglePreview);
  loadSample();
  setFormat("vertical");
})();
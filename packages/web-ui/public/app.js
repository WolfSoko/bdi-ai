// @ts-check

class DashboardApp {
  constructor() {
    /** @type {WebSocket | null} */
    this.ws = null;
    this.state = { agentName: 'BDI Agent', beliefs: [], goals: [], intentions: [], cycleCount: 0, running: false, cycleInterval: 3000 };
    /** @type {Array<{cycleNumber:number, beliefUpdates:number, goalsCommitted:number, stepsExecuted:number, errors:string[]}>} */
    this.cycleHistory = [];
    /** @type {Array<{event:string, data:unknown, timestamp:string}>} */
    this.events = [];

    this.els = {
      agentName:      document.getElementById('agent-name'),
      cycleBadge:     document.getElementById('cycle-badge'),
      connDot:        document.getElementById('conn-dot'),
      beliefCount:    document.getElementById('belief-count'),
      goalCount:      document.getElementById('goal-count'),
      intentionCount: document.getElementById('intention-count'),
      historyCount:   document.getElementById('history-count'),
      beliefsList:    document.getElementById('beliefs-list'),
      goalsList:      document.getElementById('goals-list'),
      intentionsList: document.getElementById('intentions-list'),
      historyList:    document.getElementById('history-list'),
      perceptionInput:document.getElementById('perception-input'),
      eventLog:       document.getElementById('event-log'),
      eventLogBody:   document.getElementById('event-log'),
      eventLogArrow:  document.getElementById('eventlog-arrow'),
      beliefModal:    document.getElementById('belief-modal'),
      modalBody:      document.getElementById('modal-body'),
      intervalInput:  document.getElementById('interval-input'),
    };

    this.bindEvents();
    this.connect();
  }

  // ── WebSocket ────────────────────────────────────────────────────

  connect() {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.ws = new WebSocket(`${proto}//${location.host}`);

    this.ws.onopen = () => {
      this.els.connDot.classList.add('connected');
      this.els.connDot.title = 'Connected';
    };

    this.ws.onclose = () => {
      this.els.connDot.classList.remove('connected');
      this.els.connDot.title = 'Disconnected — reconnecting...';
      setTimeout(() => this.connect(), 2000);
    };

    this.ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        this.handleMessage(msg);
      } catch { /* ignore */ }
    };
  }

  send(type, data) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }));
    }
  }

  handleMessage(msg) {
    switch (msg.type) {
      case 'state':
        this.state = msg.data;
        this.renderAll();
        break;
      case 'event':
        this.events.unshift(msg.data);
        if (this.events.length > 200) this.events.length = 200;
        this.renderEvents();
        break;
      case 'events':
        this.events = msg.data;
        this.renderEvents();
        break;
      case 'cycle':
        this.cycleHistory.unshift(msg.data);
        this.renderCycleHistory();
        break;
      case 'history':
        this.cycleHistory = msg.data.reverse();
        this.renderCycleHistory();
        break;
      case 'status':
        this.state.running = msg.data.running;
        this.state.cycleInterval = msg.data.cycleInterval;
        this.updateControls();
        break;
      case 'perception-queued':
        this.addNotification(`Perception queued: "${msg.data.text}"`);
        break;
      case 'error':
        this.addNotification(`Error: ${msg.data.error}`, true);
        break;
    }
  }

  // ── Event Binding ────────────────────────────────────────────────

  bindEvents() {
    document.getElementById('btn-step').addEventListener('click', () => {
      this.send('step');
    });

    document.getElementById('btn-start').addEventListener('click', () => {
      const interval = parseInt(this.els.intervalInput.value, 10) || 3000;
      this.send('start', { interval });
    });

    document.getElementById('btn-stop').addEventListener('click', () => {
      this.send('stop');
    });

    // Send perception
    document.getElementById('btn-send').addEventListener('click', () => this.sendPerception());
    this.els.perceptionInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.sendPerception();
    });

    // Event log toggle
    document.getElementById('eventlog-toggle').addEventListener('click', () => {
      this.els.eventLogBody.classList.toggle('open');
      this.els.eventLogArrow.classList.toggle('open');
    });

    // Modal close
    document.getElementById('modal-close').addEventListener('click', () => {
      this.els.beliefModal.classList.remove('visible');
    });
    this.els.beliefModal.addEventListener('click', (e) => {
      if (e.target === this.els.beliefModal) this.els.beliefModal.classList.remove('visible');
    });
  }

  sendPerception() {
    const text = this.els.perceptionInput.value.trim();
    if (!text) return;
    this.send('perception', { text });
    this.els.perceptionInput.value = '';
  }

  // ── Render ───────────────────────────────────────────────────────

  renderAll() {
    this.els.agentName.textContent = this.state.agentName;
    this.els.cycleBadge.textContent = `Cycle ${this.state.cycleCount}`;
    this.renderBeliefs();
    this.renderGoals();
    this.renderIntentions();
    this.updateControls();
  }

  updateControls() {
    const btnStart = document.getElementById('btn-start');
    const btnStop = document.getElementById('btn-stop');
    btnStart.disabled = this.state.running;
    btnStop.disabled = !this.state.running;
  }

  // ── Beliefs ──────────────────────────────────────────────────────

  renderBeliefs() {
    const beliefs = this.state.beliefs || [];
    this.els.beliefCount.textContent = beliefs.length;

    if (beliefs.length === 0) {
      this.els.beliefsList.innerHTML = '<div class="empty">No beliefs yet</div>';
      return;
    }

    const sorted = [...beliefs].sort((a, b) => b.confidence - a.confidence);
    this.els.beliefsList.innerHTML = sorted.map(b => {
      const pct = Math.round(b.confidence * 100);
      const color = this.confidenceColor(b.confidence);
      return `
        <div class="belief-item" data-belief-id="${this.esc(b.id)}">
          <div class="confidence-bar">
            <div class="confidence-fill" style="width:${pct}%;background:${color}"></div>
          </div>
          <span class="confidence-value">${b.confidence.toFixed(2)}</span>
          <span class="belief-content">${this.esc(b.content)}</span>
          <span class="belief-source ${this.esc(b.source)}">${this.esc(b.source)}</span>
        </div>`;
    }).join('');

    // Click to inspect
    this.els.beliefsList.querySelectorAll('.belief-item').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.getAttribute('data-belief-id');
        const belief = beliefs.find(b => b.id === id);
        if (belief) this.showBeliefModal(belief);
      });
    });
  }

  showBeliefModal(b) {
    const pct = Math.round(b.confidence * 100);
    const color = this.confidenceColor(b.confidence);
    const tags = (b.tags || []).map(t => `<span class="tag">${this.esc(t)}</span>`).join('') || '<span class="tag">none</span>';
    const meta = b.metadata && Object.keys(b.metadata).length > 0
      ? `<pre style="margin:0;white-space:pre-wrap;font-size:0.8rem">${this.esc(JSON.stringify(b.metadata, null, 2))}</pre>`
      : '<span style="color:var(--text2)">none</span>';

    this.els.modalBody.innerHTML = `
      <div class="modal-row">
        <div class="modal-label">Content</div>
        <div class="modal-value">${this.esc(b.content)}</div>
      </div>
      <div class="modal-row">
        <div class="modal-label">Confidence</div>
        <div class="modal-value">
          <span class="mono">${b.confidence.toFixed(3)}</span>
          <div class="confidence-bar-large">
            <div class="confidence-fill" style="width:${pct}%;background:${color};height:100%;border-radius:5px"></div>
          </div>
        </div>
      </div>
      <div class="modal-row">
        <div class="modal-label">Source</div>
        <div class="modal-value"><span class="belief-source ${this.esc(b.source)}">${this.esc(b.source)}</span></div>
      </div>
      <div class="modal-row">
        <div class="modal-label">Tags</div>
        <div class="modal-value">${tags}</div>
      </div>
      <div class="modal-row">
        <div class="modal-label">ID</div>
        <div class="modal-value mono">${this.esc(b.id)}</div>
      </div>
      <div class="modal-row">
        <div class="modal-label">Created</div>
        <div class="modal-value mono">${this.formatDate(b.createdAt)}</div>
      </div>
      <div class="modal-row">
        <div class="modal-label">Updated</div>
        <div class="modal-value mono">${this.formatDate(b.updatedAt)}</div>
      </div>
      <div class="modal-row">
        <div class="modal-label">Metadata</div>
        <div class="modal-value">${meta}</div>
      </div>
    `;
    this.els.beliefModal.classList.add('visible');
  }

  // ── Goals ────────────────────────────────────────────────────────

  renderGoals() {
    const goals = this.state.goals || [];
    this.els.goalCount.textContent = goals.length;

    if (goals.length === 0) {
      this.els.goalsList.innerHTML = '<div class="empty">No goals yet</div>';
      return;
    }

    const statusIcon = { pending: '?', active: '*', achieved: '+', failed: '!', suspended: '-' };
    const sorted = [...goals].sort((a, b) => b.priority - a.priority);

    this.els.goalsList.innerHTML = sorted.map(g => {
      const icon = statusIcon[g.status] || '?';
      const deadline = g.deadline ? `<span class="goal-deadline">${this.formatDate(g.deadline)}</span>` : '';
      return `
        <div class="goal-item">
          <div class="goal-status ${this.esc(g.status)}" title="${this.esc(g.status)}">${icon}</div>
          <span class="goal-desc" title="${this.esc(g.description)}">${this.esc(g.description)}</span>
          <span class="goal-priority">${g.priority.toFixed(1)}</span>
          ${deadline}
        </div>`;
    }).join('');
  }

  // ── Intentions ───────────────────────────────────────────────────

  renderIntentions() {
    const intentions = this.state.intentions || [];
    this.els.intentionCount.textContent = intentions.length;

    if (intentions.length === 0) {
      this.els.intentionsList.innerHTML = '<div class="empty">No intentions yet</div>';
      return;
    }

    // Active first, then completed/failed
    const sorted = [...intentions].sort((a, b) => {
      const order = { active: 0, suspended: 1, completed: 2, failed: 3 };
      return (order[a.status] ?? 9) - (order[b.status] ?? 9);
    });

    this.els.intentionsList.innerHTML = sorted.map(i => {
      const steps = i.plan?.steps || [];
      const current = i.currentStepIndex;

      const blocks = steps.map((s, idx) => {
        let cls = 'step-block';
        if (i.status === 'failed') {
          cls += idx < current ? ' done' : idx === current ? ' failed' : '';
        } else if (i.status === 'completed') {
          cls += ' done';
        } else {
          cls += idx < current ? ' done' : idx === current ? ' current' : '';
        }
        return `<div class="${cls}" title="${this.esc(s.description)}"></div>`;
      }).join('');

      const labels = steps.map(s =>
        `<div class="step-label" title="${this.esc(s.description)}">${this.esc(s.actionName)}</div>`
      ).join('');

      return `
        <div class="intention-item">
          <div class="intention-header">
            <span class="intention-goal">${this.esc(i.goal?.description || '?')}</span>
            <span class="intention-status ${this.esc(i.status)}">${this.esc(i.status)}</span>
          </div>
          <div class="intention-plan">Plan: ${this.esc(i.plan?.name || 'unknown')} (${current}/${steps.length})</div>
          <div class="step-timeline">${blocks}</div>
          <div class="step-labels">${labels}</div>
        </div>`;
    }).join('');
  }

  // ── Cycle History ────────────────────────────────────────────────

  renderCycleHistory() {
    this.els.historyCount.textContent = this.cycleHistory.length;

    if (this.cycleHistory.length === 0) {
      this.els.historyList.innerHTML = '<div class="empty">No cycles yet</div>';
      return;
    }

    this.els.historyList.innerHTML = this.cycleHistory.slice(0, 50).map(c => {
      const errText = c.errors.length > 0 ? `${c.errors.length} err` : '';
      return `
        <div class="cycle-item">
          <span class="cycle-num">#${c.cycleNumber}</span>
          <span class="cycle-stats">${c.beliefUpdates}B ${c.goalsCommitted}G ${c.stepsExecuted}S</span>
          ${errText ? `<span class="cycle-errors">${errText}</span>` : ''}
        </div>`;
    }).join('');
  }

  // ── Event Log ────────────────────────────────────────────────────

  renderEvents() {
    if (this.events.length === 0) {
      this.els.eventLog.innerHTML = '<div class="empty">No events yet</div>';
      return;
    }

    this.els.eventLog.innerHTML = this.events.slice(0, 80).map(e => {
      const time = e.timestamp ? new Date(e.timestamp).toLocaleTimeString() : '';
      let nameClass = 'event-name';
      if (e.event.includes('fail') || e.event.includes('error')) nameClass += ' error';
      else if (e.event.includes('success') || e.event.includes('achieved')) nameClass += ' success';

      const dataStr = e.data ? this.summarizeData(e.data) : '';
      return `
        <div class="event-entry">
          <span class="event-time">${time}</span>
          <span class="${nameClass}">${this.esc(e.event)}</span>
          <span class="event-data">${this.esc(dataStr)}</span>
        </div>`;
    }).join('');
  }

  // ── Helpers ──────────────────────────────────────────────────────

  addNotification(text, isError = false) {
    this.events.unshift({
      event: isError ? 'ui:error' : 'ui:info',
      data: { message: text },
      timestamp: new Date().toISOString(),
    });
    this.renderEvents();
  }

  confidenceColor(c) {
    if (c >= 0.8) return '#22c55e';
    if (c >= 0.5) return '#f59e0b';
    return '#ef4444';
  }

  formatDate(d) {
    if (!d) return '';
    const date = typeof d === 'string' ? new Date(d) : d;
    return date.toLocaleString();
  }

  summarizeData(data) {
    if (typeof data === 'string') return data;
    if (!data || typeof data !== 'object') return '';
    const parts = [];
    for (const [k, v] of Object.entries(data)) {
      if (v === null || v === undefined) continue;
      if (typeof v === 'object') {
        if (Array.isArray(v)) parts.push(`${k}:[${v.length}]`);
        else parts.push(`${k}:{...}`);
      } else {
        const s = String(v);
        parts.push(`${k}:${s.length > 40 ? s.slice(0, 40) + '...' : s}`);
      }
      if (parts.length >= 3) break;
    }
    return parts.join('  ');
  }

  esc(s) {
    if (typeof s !== 'string') return String(s ?? '');
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}

// Boot
window.addEventListener('DOMContentLoaded', () => new DashboardApp());

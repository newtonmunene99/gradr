import * as firebase from "firebase/app";

import marked from 'marked';

import {
  rAF,
  trim,
  goTo,
  select,
  selectAll,
  countDown,
  extractCode,
  dateTimeDiff,
  isWithinDeadline
} from '../../commons/js/utils.js';
import language from '../../commons/js/monacoEditor/monaco-lang';
import { monacoCreate } from '../../commons/js/monacoEditor/monaco-init';

let spec;
let toast;
let device;
let editor;
let GARelay;
let appUser;
let testId;
let projectId;
let assessment;
let instructions;
let sandboxWindow;

let batchedProgress = [];
let assessmentProgress = {};
let savingBatchedProgress = false;

let lastSavedCode;

const SPECS = firebase.firestore().collection('specs');
const SUBMISSIONS = firebase.firestore().collection('submissions');

const resetButtonIcon = select("#reset-code");
const resetDialogComponent = select(`[data-action='reset-dialog']`);
const cancelResetButton = select(`[data-mdc-dialog-action='close']`);
const confirmResetButton = select(`[data-action='reset-confirm']`);
const resetDialogScrim = select('.mdc-dialog__scrim');

const challengeInfo = select('[data-challenge-info]');
const testOverMsg = 'This assessment is closed. Your changes will not be saved or evaluated';

const notify = (msg) => {
  let message = trim(msg);
  if (message === '') return;

  if (message === 'ERROR') {
    message = `You've Got One Or More Syntax Errors In Your Code!`;
  }

  const toastr = select('#toast');
  if (!toast) toast = mdc.snackbar.MDCSnackbar.attachTo(toastr);
  // toast.close();

  toastr.querySelector('.mdc-snackbar__label').textContent = message;
  toast.timeoutMs = 10000;
  toast.open();
};

const signOut = event => {
  event.preventDefault();
  firebase.auth().signOut();

  GARelay.ga('send', {
    hitType: 'event',
    eventCategory: 'Playground',
    eventAction: 'signout',
    eventLabel: `${assessment.slug}`
  });
};

const setupAccount = () => {
  const userIconBtn = select('button[data-profile]');
  if(appUser.photoURL) {
    const img = document.createElement("img");
    img.src = appUser.photoURL;
    userIconBtn.appendChild(img);

    userIconBtn.classList.add('has-usr-photo');
  }
  
  const usrMenu = mdc.menu.MDCMenu.attachTo(select('.mdc-menu'));
  userIconBtn.addEventListener('click', event => {
    event.preventDefault();
    if (!usrMenu.open) {
      usrMenu.open = true;
    }
  });
  usrMenu.setFixedPosition(true);
  select('#signout').addEventListener('click', signOut);
};

const prepareEmulatorPreview = () => {
  if (device) device.classList.remove('live');
  if (instructions) instructions.classList.remove('live');
};

const switchPreviewToEmulator = () => {
  if (instructions) {
    instructions.classList.remove('live');
  }

  if (device) {
    device.classList.add('live');
  }

  select('#toggle-viewer').classList.add('mdc-icon-button--on');
};

const switchPreviewToInstructions = () => {
  if (device) {
    device.classList.remove('live');
  }

  if (instructions) {
    instructions.classList.add('live');
  }

  select('#toggle-viewer').classList.remove('mdc-icon-button--on');
};

const showCountdown = async () => {
  if (!('RelativeTimeFormat' in Intl)) {
    await import('intl-relative-time-format');
  }

  const { endingAt } = assessment;
  const deadline = new Date(`${endingAt}`);

  const timeSplainer = select(`[data-timer]`);
  const timer = timeSplainer.querySelector('span');
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  const displayCountdown = ({ diff, diffType }) => {
    if (diff < 0 && diffType === 'second') {
      let type = 'hour';
      let ellapsedDiff = dateTimeDiff({ to: deadline, type });

      if (ellapsedDiff > 24) {
        type = 'day'
        ellapsedDiff = dateTimeDiff({ to: deadline, type });
      }

      timer.textContent = rtf.format(ellapsedDiff, type);
      return;
    }
    timer.textContent = rtf.format(diff, `${diffType}`);
    timeSplainer.setAttribute('data-timer-on', 'why-not');
  };

  countDown({ to: deadline, callback: displayCountdown });
};

const updateProjectWork = changes => SUBMISSIONS.doc(projectId).update(changes);

const createProject = async (email) => {
  let { starterCodebase } = spec;

  // TODO remove this after fully migrating
  // all starter code into SPECs
  if(!starterCodebase) {
    const response = await fetch('/mygradr/tpl/start.html');
    starterCodebase = await response.text();
  }

  const entry = {
    email,
    assessment: testId,
    firstSeen: Date.now(),
    code: starterCodebase
  };

  const ref = await SUBMISSIONS.add(entry);
  projectId = ref.id;
  const project = await SUBMISSIONS.doc(projectId).get();
  return project;
};

const updateLastSeenTime = async (project) => {
  projectId = project.id;
  const entry = {
    lastSeen: Date.now()
  };

  await updateProjectWork(entry);
  const updated = await SUBMISSIONS.doc(projectId).get();
  return updated;
};

const createOrUpdateProject = async () => {
  const { email } = appUser;
  const query = SUBMISSIONS
    .where('assessment', '==', testId)
    .where('email', '==', email);

  const snapshot = await query.get();
  if (snapshot.empty === true) {
    notify('Initialising your assessment, please wait ...');
    const created = await createProject(email);
    return created;
  }

  const [doc] = snapshot.docs;
  const updated = await updateLastSeenTime({
    id: doc.id,
    data: doc.data()
  });
  return updated;
};

const setupInstructions = async (challengeIndex) => {
  if (challengeIndex < 0) {
    let assessmentName = assessment.name || 'Andela Fellowship';
    assessmentName = assessmentName.replace(/\s+\w+-\d{2,}$/, '');

    const response = await fetch(`/mygradr/tpl/intro.md`);
    const text = await response.text();
    return text
      .replace('{name}', appUser.displayName || '')
      .replace('{program}', assessmentName)
      .replace('{app}', spec.about)
      .replace('{challenges}', spec.challenges.length || 'a few')
      .replace('{specname}', spec.name || 'your app')
      .replace('{specname}', spec.name || 'your app');
  }

  if (challengeIndex >= spec.challenges.length) {
    const response = await fetch(`/mygradr/tpl/outro.md`);
    const text = await response.text();
    return text.replace('{name}', appUser.displayName || '');
  }

  return spec.challenges[challengeIndex].guide;
};

const safelyIncrementChallengeIndex = (challengeLength, challengeIndex) => {
  const normalised =
    challengeIndex >= challengeLength ? challengeLength : challengeIndex + 1;
  return normalised;
};

const navigateToChallengeInstructions = async (challengeIndex) => {
  const intructions = await setupInstructions(challengeIndex);
  if(challengeInfo) {
    const renderer = new marked.Renderer();
    renderer.link = (href, title, text) => {
      const normalisedTitle = title === null ? 'external resource' : title;
      let target = '';
      if(/http|www/.test(href)) target = `target="_blank"`;
      return `<a href="${href}" title="${normalisedTitle}" ${target}>${text}</a>`;
    }

    challengeInfo.innerHTML = marked(intructions, {
      gfm: true,
      renderer,
      smartLists: true
    });
  }

  const appTitle = select('#instructions span.what');
  const progress = select('#instructions span.step');

  const challengeLen = spec.challenges.length;
  const normalised = safelyIncrementChallengeIndex(challengeLen, challengeIndex);

  if (appTitle && progress) {
    appTitle.textContent = spec.name;
    progress.textContent =
      challengeIndex < 0
        ? 'Mini App!'
        : `Challenge ${normalised} of ${challengeLen}`;

    if (normalised > challengeLen) {
      progress.textContent = `You've Completed ${progress.textContent}`
    }
  }
  return instructions;
};

const displayProgressAndInstructions = async (challengeIndex) => {
  await navigateToChallengeInstructions(challengeIndex);
  const challengeLen = spec.challenges.length;
  const normalised = safelyIncrementChallengeIndex(challengeLen, challengeIndex);

  localStorage.setItem(
    'challengeIndex',
    normalised === challengeLen ? normalised - 1 : normalised
  );

  if (challengeIndex >= 0) {

    Array.from(selectAll(`button[data-challange-step]`))
      .map(btn => {
        if (btn) {
          // btn.setAttribute('disabled', 'disabled');
          btn.removeAttribute('data-challange-status');
          btn.removeAttribute('data-challange-audit');
        }
        return btn;
      });

    const challangeSlots = Array.from({ length: challengeLen + 1 }, (x, i) => i);
    const slotsCoverage = challangeSlots.slice(0, challangeSlots.indexOf(challengeIndex));

    // tick off challenges the candidate has completed
    slotsCoverage.forEach(slot => {
      const btn = select(`button[data-challange-step='${slot}']`);
      if (btn) {
        btn.setAttribute('data-challange-audit', 'passing');
      }
    });

    // indicate the current challenge
    const btn = select(`button[data-challange-step='${challengeIndex}']`);
    if (btn) {
      btn.setAttribute('data-challange-status', 'active');
    }
  }
};

const getAssessmentSpec = async () => {
  if (!spec || spec.id !== assessment.spec) {
    const specification = await SPECS.doc(assessment.spec).get();
    spec = {
      id: specification.id,
      ...specification.data()
    };
  }

  return spec;
};

const progressTo = async (challengeIndex) => {
  await getAssessmentSpec();
  displayProgressAndInstructions(challengeIndex);
};

/**
 * @function
 * @returns {string} code written by candidate
 */
const getCode = () =>  {
  let codebase = editor && editor.getValue();
  if (!codebase) {
    const { code } = JSON.parse(localStorage.getItem('work'));
    codebase = code;
  }
  return codebase;
}

const initOrResetProjectWork = async ({isReset, started, challengeIndex, displayName, completedChallenge = -1}) => {
  let status = {challengeIndex, completedChallenge};
  if(isReset) {
    const { starterCodebase } = spec;
    const resets = assessment.resets || [];
    resets.push(Date.now());
    status = {...status, ...{
      resets,
      code: starterCodebase
    }};
  } else {
    status = {...status, ...{
      started,
      displayName
    }};
  }

  await updateProjectWork(status);
  // assessmentProgress = {challengeIndex, completedChallenge};
  await setAssessmentProgress();
  if(!isReset) select('body').setAttribute('data-assessment', started);
};

const initProject = async () => {
  const challengeIndex = 0;
  const started = Date.now();

  let aName = [''];
  if (appUser && appUser.displayName) {
    aName = appUser.displayName.split(/\s+/);
  }

  await initOrResetProjectWork({ started, challengeIndex, displayName:aName.join(' ') });
  
  progressTo(challengeIndex);
  editor.updateOptions({readOnly: false});
  notify(`Yo, you can now begin the assessment. Take it away ${aName[0]}!`);
  rAF({ wait: 500 }).then(() => {
    select('body').classList.remove('mdc-dialog-scroll-lock', 'mdc-dialog--open');
  });

  GARelay.ga('send', {
    hitType: 'event',
    eventCategory: 'Playground',
    eventAction: 'assessment-started',
    eventLabel: `${assessment.slug}`
  });
};

const challengeIntro = async () => {
  select('button.action-begin').addEventListener('click', () => {
    select('body').classList.add('mdc-dialog-scroll-lock', 'mdc-dialog--open');

    let aName = [''];
    if (appUser && appUser.displayName) {
      aName = appUser.displayName.split(/\s+/);
    }

    notify(`Thats right ${aName[0]}! Please wait while we start things off for you ...`);
    initProject();
    
    GARelay.ga('send', {
      hitType: 'event',
      eventCategory: 'Playground',
      eventAction: 'begin-assessment',
      eventLabel: `${assessment.slug}`
    });
  });

  // await getAssessmentSpec();
  displayProgressAndInstructions(-1);
  switchPreviewToInstructions();
};

const playCode = () => {
  const challengeIndex = parseInt(localStorage.getItem('challengeIndex'), 10);
  if (challengeIndex < 0) {
    initProject();
  }

  const code = getCode();
  if (!code) return;

  notify('Lets Run Your Code ...');

  prepareEmulatorPreview();
  const payload = extractCode(code);
  sandboxWindow.postMessage(
    {
      payload,
      spec: spec.id,
      assessment: testId
    },
    window.location.origin
  );
  lastSavedCode = code;
};

const handleChallengeNavClicks = (event) => {
  event.preventDefault();

  const target = event.target.closest('button');
  const isActive = target.getAttribute('data-challange-status') === 'active';
  const isPassing = target.getAttribute('data-challange-audit') === 'passing';
  const navState = isActive || isPassing;

  GARelay.ga('send', {
    hitType: 'event',
    eventCategory: 'Playground',
    eventAction: 'challenge-nav',
    eventLabel: `${assessment.slug}`
  });
  
  if(navState) {
    const step = target.getAttribute('data-challange-step') || 0;
    navigateToChallengeInstructions(parseInt(step, 10));
    switchPreviewToInstructions();
  }
};

/**
 * @description fetches the users work and sets
 * the value of the assessmentProgress variable
 */
const setAssessmentProgress = async () => {
  const existingWork = await SUBMISSIONS.doc(projectId).get();
  const data = existingWork.data();
  assessmentProgress = {...assessmentProgress, ...{
    challengeIndex: data.challengeIndex,
    completedChallenge: data.completedChallenge 
  }};
};

const saveWorkBatched = async () => {
  savingBatchedProgress = true;
  const start = { completedChallenge: -1, challengeIndex: 0 };
  const performance = batchedProgress.reduce((perf, { completedChallenge, challengeIndex }) => {
    if (completedChallenge > perf.completedChallenge) {
      return { completedChallenge, challengeIndex };
    }
    return perf;
  }, start);

  await updateProjectWork({
    ...performance,
    lastRun: Date.now(),
    code: editor.getValue()
  });

  await setAssessmentProgress();

  batchedProgress = [];
  savingBatchedProgress = false;
};

/**
 * @description handles the saving of users progress
 * if the changes on the challenge is before the specified deadline
 * 
 * @param {object} assessment progress 
 */
const saveWork = ({completedChallenge, challengeIndex, silent = false}) => {
  const { endingAt } = assessment;
  if(isWithinDeadline({ endingAt })){
    if(!silent) notify('Saving Your Code...');
    if(batchedProgress.length === 0) {
      // TODO queue this with promises instead
      // right now, we have no way of knowing 
      // that the save operation is done or if it failed
      rAF({wait: 5000})
      .then(() => {
        saveWorkBatched();
      });
    }

    if (savingBatchedProgress === true) return;

    batchedProgress.push({ completedChallenge, challengeIndex });

    if(!silent) notify('Your changes have been saved');
  } else {
    notify(testOverMsg);
  }
};

/**
 * @description checks whether the user has made changes to the code.
 */
const codeHasChanged = () => {
  const currentCode = getCode();
  return lastSavedCode !== currentCode;
};

/**
 * @description Saves the codes from the editor
 */
const saveCode = () => {
  const { endingAt } = assessment;
  if(codeHasChanged() && isWithinDeadline({ endingAt })){
    const code = getCode();
    if (!code) return;

    saveWork({
      challengeIndex: assessmentProgress.challengeIndex,
      completedChallenge: assessmentProgress.completedChallenge
    });
    lastSavedCode = code;
  }
};

const resetCodebase = async () => {
  const { endingAt } = assessment;
  if( !isWithinDeadline({endingAt}) ) return;

  resetDialogComponent.classList.remove('mdc-dialog--open');
  await initOrResetProjectWork({ isReset: true, challengeIndex:0 });
  
  const { starterCodebase } = spec;
  editor.setValue(starterCodebase);
}

const closeResetDialog = () => {
  resetDialogComponent.classList.remove('mdc-dialog--open');
  cancelResetButton.removeEventListener('click', closeResetDialog);
  resetDialogScrim.removeEventListener('click', closeResetDialog);
  confirmResetButton.removeEventListener('click', resetCodebase);
};

const openResetDialog = () => {
  const { starterCodebase } = spec;
  const currentCodebase = editor.getValue();
  if (!(starterCodebase === currentCodebase)) {
    resetDialogComponent.classList.add('mdc-dialog--open');
    cancelResetButton.addEventListener('click', closeResetDialog);
    resetDialogScrim.addEventListener('click', closeResetDialog);
    confirmResetButton.addEventListener('click', resetCodebase);
  } else {
    notify('Nothing to reset. You have not made changes to your starter code');
  }
};

const setTheStage = async (challengeIndex, started) => {
  const { endingAt } = assessment;
  const isBeforeDeadline = isWithinDeadline({ endingAt });

  localStorage.setItem('challengeIndex', challengeIndex);
  notify('building your playground ...');

  mdc.topAppBar.MDCTopAppBar.attachTo(select('.mdc-top-app-bar'));
  if(isBeforeDeadline) {
    resetButtonIcon.style.display = 'block'; 
    resetButtonIcon.addEventListener('click', openResetDialog);
  }

  setupAccount();

  select('#runit').addEventListener('click', (event) => {
    event.preventDefault();
    playCode();

    GARelay.ga('send', {
      hitType: 'event',
      eventCategory: 'Playground',
      eventAction: 'play-code-btn',
      eventLabel: `${assessment.slug}`
    });
  });

  Array.from(selectAll(`button[data-challange-step]`)).forEach(btn => {
    btn.addEventListener('click', handleChallengeNavClicks);
    const btnRipple = mdc.ripple.MDCRipple.attachTo(btn);
    btnRipple.unbounded = true;
  });

  const toggleViewer = new mdc.iconButton.MDCIconButtonToggle(select('#toggle-viewer'));
  toggleViewer.listen('MDCIconButtonToggle:change', ({ detail }) => {
    if (detail.isOn === true) {
      switchPreviewToEmulator();
      GARelay.ga('send', {
        hitType: 'event',
        eventCategory: 'Playground',
        eventAction: 'toggle-to-emulator',
        eventLabel: `${assessment.slug}`
      });
    } else {
      switchPreviewToInstructions();
      GARelay.ga('send', {
        hitType: 'event',
        eventCategory: 'Playground',
        eventAction: 'toggle-to-instructions',
        eventLabel: `${assessment.slug}`
      });
    }
  });

  notify('building your auto-grader ...');

  const sandbox = select('#sandbox');
  const viewer = select('#viewer');
  sandbox.setAttribute('src', '/mygradr/sandbox.html');
  sandboxWindow = sandbox.contentWindow;

  let readOnly = true;
  if (challengeIndex >= 0 && started) {
    readOnly = false;
    select('body').setAttribute('data-assessment', started);
  }

  const codeEditor = monacoCreate({ language: language.html, fontSize: 16, readOnly}, select('#code'));

  document.body.addEventListener('mouseleave', saveCode);
  window.addEventListener('beforeunload', saveCode);

  notify('DONE!');
  return { codeEditor, sandbox, viewer };
};

const handleSandboxMessages = async (event) => {
  if (event.origin !== window.location.origin) return;

  const { feedback, advancement } = event.data;

  if (feedback) {
    notify(feedback.message);
  }

  if (advancement) {
    const { index, completed } = advancement;
    const normalisedIndex = index >= spec.challenges.length ? completed : index;

    saveWork({
      silent: true,
      completedChallenge: completed,
      challengeIndex: normalisedIndex
    });
    progressTo(index);
  } else {
    saveWork({
      silent: true,
      challengeIndex: assessmentProgress.challengeIndex,
      completedChallenge: assessmentProgress.completedChallenge
    });
  }

  switchPreviewToEmulator();
};

const handleSpecialKeyCombinations = () => {
  document.addEventListener('keyup', event => {
    const key = event.which || event.keyCode;

    if (event.ctrlKey && key === 13) {
      playCode();

      GARelay.ga('send', {
        hitType: 'event',
        eventCategory: 'Playground',
        eventAction: 'play-code-keys',
        eventLabel: `${assessment.slug}`
      });
    }
  });
};

const proceed = async (project) => {
  const { code, started, challengeIndex } = project;
  const whereAmI = !started ? -1 : parseInt(challengeIndex, 10);

  const stage = await setTheStage(whereAmI, started);
  const { codeEditor, viewer } = stage;
  device = viewer;
  editor = codeEditor;
  editor.setValue(code);
  lastSavedCode = code;

  editor.onDidPaste(() => {
    editor.getModel().undo();
  });

  instructions = select('#instructions');
  rAF({ wait: 500 }).then(() => showCountdown());
  window.addEventListener('message', handleSandboxMessages);
  handleSpecialKeyCombinations();

  if (whereAmI === -1) {
    challengeIntro();
  }

  if (whereAmI >= 0) {
    await progressTo(whereAmI);
    await setAssessmentProgress();

    const { endingAt } = assessment;
    if (isWithinDeadline({ endingAt })) {
      if ((whereAmI + 1) >= spec.challenges.length) {
        // though within deadline, this user has completed this assessment. 
        notify('Wanna Re-run your code and preview your app? Click the play button!');
        return;
      }
      switchPreviewToInstructions();
      notify('Consult the instructions and code along. Click the play button to see the output and get instant feedback.');
    } else {
      // TODO just playback performace
      // playCode();
      editor.updateOptions({readOnly: true});
      notify(`This assessment is closed and will no longer allow code edits. For now, you can click the play button to preview your saved work`);
    }
  }
};

const deferredEnter = async (args) => {
  const { user, test, assessmentDoc } = args;
  testId = test;
  appUser = user;

  assessment = {
    id: assessmentDoc.id,
    ...assessmentDoc.data()
  };

  goTo('playground', { test });

  import('../../commons/js/GARelay.js')
  .then(module => {
    GARelay = module.default;
  });

  await getAssessmentSpec();
  const project = await createOrUpdateProject();
  proceed(project.data());
};

export const enter = async (args = {}) => {
  notify('Building your playground, please wait ...');
  deferredEnter(args);
};
export default { enter };

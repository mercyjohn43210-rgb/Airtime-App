const $ = id => document.getElementById(id);

const BACKEND_URL =
  'https://johnmercy-backend-46c5.onrender.com';

let s =
  JSON.parse(localStorage.getItem('jm_airtime') || 'null') || {
    logged: false,
    balance: 0,
    history: []
  };

let signup = false;
let transferTimer = null;
let dataPlans = [];


/* =========================================
   MONEY
========================================= */

const money = n =>
  '₦' +
  Number(n || 0).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });


/* =========================================
   SAVE
========================================= */

function save() {
  localStorage.setItem(
    'jm_airtime',
    JSON.stringify(s)
  );

  render();
}


/* =========================================
   MESSAGE
========================================= */

function msg(message) {

  const toast = $('toast');

  if (!toast) return;

  toast.textContent = message;
  toast.style.display = 'block';

  setTimeout(() => {
    toast.style.display = 'none';
  }, 2500);
}


/* =========================================
   RENDER
========================================= */

function render() {

  if ($('auth')) {
    $('auth').classList.toggle(
      'hidden',
      s.logged
    );
  }

  if ($('app')) {
    $('app').classList.toggle(
      'hidden',
      !s.logged
    );
  }

  if ($('logout')) {
    $('logout').classList.toggle(
      'hidden',
      !s.logged
    );
  }

  if ($('balance')) {
    $('balance').textContent =
      money(s.balance);
  }

  if ($('walletBalance')) {
    $('walletBalance').textContent =
      money(s.balance);
  }

  if ($('transactions')) {

    $('transactions').innerHTML =
      s.history.length
        ? s.history.map(x => `
            <div class="history">

              <b>${x.type}</b>

              <br>

              <span class="muted">
                ${x.details || ''}
              </span>

              <br>

              ${money(x.amount)}

            </div>
          `).join('')
        : '<p class="muted">No transactions yet.</p>';
  }
}


/* =========================================
   LOAD WALLET
========================================= */

async function loadWallet() {

  if (!s.user || !s.user.email) {
    return;
  }

  try {

    const email =
      encodeURIComponent(s.user.email);

    const response =
      await fetch(
        `${BACKEND_URL}/wallet/${email}`
      );

    const data =
      await response.json();

    console.log(
      'Wallet:',
      data
    );

    if (
      response.ok &&
      data.success &&
      data.wallet
    ) {

      s.balance =
        Number(data.wallet.balance) || 0;

      save();
    }

  } catch (error) {

    console.error(
      'Wallet error:',
      error
    );
  }
}


/* =========================================
   LOAD DATA PLANS
========================================= */

async function loadDataPlans() {

  const planSelect = $('dPlan');

  if (!planSelect) {
    console.error(
      'dPlan was not found in index.html'
    );
    return;
  }

  planSelect.innerHTML =
    '<option value="">Loading data plans...</option>';

  try {

    const response =
      await fetch(
        `${BACKEND_URL}/data`,
        {
          method: 'GET',
          cache: 'no-store'
        }
      );

    const data =
      await response.json();

    console.log(
      'DATA API RESPONSE:',
      data
    );

    if (
      !response.ok ||
      !data.success ||
      !Array.isArray(data.plans)
    ) {

      throw new Error(
        data.error ||
        'Invalid data plan response'
      );
    }

    dataPlans =
      data.plans;

    console.log(
      'TOTAL DATA PLANS:',
      dataPlans.length
    );

    populateDataPlans();

  } catch (error) {

    console.error(
      'DATA PLAN ERROR:',
      error
    );

    planSelect.innerHTML =
      '<option value="">Unable to load plans</option>';

    msg(
      'Unable to load data plans.'
    );
  }
}


/* =========================================
   POPULATE DATA PLANS
========================================= */

function populateDataPlans() {

  const planSelect =
    $('dPlan');

  if (!planSelect) {
    return;
  }

  planSelect.innerHTML = '';

  if (!dataPlans.length) {

    planSelect.innerHTML =
      '<option value="">No data plans available</option>';

    return;
  }


  /*
    Group plans by category.
    This accepts:
    Regular
    Gift
    Corporate

    It also accepts lowercase versions.
  */

  const categoryNames = {
    regular: 'Regular Data',
    gift: 'Gift Data',
    corporate: 'Corporate Data'
  };


  const categories = [
    'regular',
    'gift',
    'corporate'
  ];


  categories.forEach(categoryKey => {

    const plans =
      dataPlans.filter(plan => {

        const category =
          String(
            plan.category || ''
          )
          .trim()
          .toLowerCase();

        return category === categoryKey;
      });


    if (!plans.length) {
      return;
    }


    const group =
      document.createElement('optgroup');

    group.label =
      categoryNames[categoryKey];


    plans.forEach(plan => {

      const option =
        document.createElement('option');

      option.value =
        plan.id;

      option.textContent =
        `${plan.network || ''} ${plan.size || ''} — ${money(plan.amount)} — ${plan.validity || ''}`;

      group.appendChild(option);
    });


    planSelect.appendChild(group);

  });


  /*
    Fallback:
    If the backend category names ever change,
    still display the plans instead of showing
    an empty dropdown.
  */

  if (!planSelect.children.length) {

    dataPlans.forEach(plan => {

      const option =
        document.createElement('option');

      option.value =
        plan.id;

      option.textContent =
        `${plan.network || ''} ${plan.size || ''} — ${money(plan.amount)} — ${plan.validity || ''}`;

      planSelect.appendChild(option);

    });
  }


  updateSelectedDataPlan();
  filterDataPlans();
}


/* =========================================
   FILTER BY NETWORK + CATEGORY
========================================= */

function filterDataPlans() {

  const planSelect =
    $('dPlan');

  const networkSelect =
    $('dNetwork');

  const categorySelect =
    $('dCategory');

  if (
    !planSelect ||
    !dataPlans.length
  ) {
    return;
  }


  const selectedNetwork =
    networkSelect
      ? networkSelect.value
      : 'MTN';


  const selectedCategory =
    categorySelect
      ? categorySelect.value.toLowerCase()
      : 'regular';


  const filtered =
    dataPlans.filter(plan => {

      const planNetwork =
        String(
          plan.network || ''
        )
        .trim()
        .toLowerCase();

      const planCategory =
        String(
          plan.category || ''
        )
        .trim()
        .toLowerCase();

      return (
        planNetwork ===
          selectedNetwork.toLowerCase()
        &&
        planCategory ===
          selectedCategory
      );
    });


  planSelect.innerHTML = '';


  if (!filtered.length) {

    planSelect.innerHTML =
      '<option value="">No plans available</option>';

    const details =
      $('dataPlanDetails');

    if (details) {
      details.textContent =
        'No plans available for this selection.';
    }

    const price =
      $('dataPrice');

    if (price) {
      price.value = '';
    }

    return;
  }


  filtered.forEach(plan => {

    const option =
      document.createElement('option');

    option.value =
      plan.id;

    option.textContent =
      `${plan.size} — ${money(plan.amount)} — ${plan.validity}`;

    planSelect.appendChild(option);

  });


  updateSelectedDataPlan();
}


/* =========================================
   SELECTED DATA PLAN
========================================= */

function updateSelectedDataPlan() {

  const planSelect =
    $('dPlan');

  if (!planSelect) {
    return;
  }

  const plan =
    dataPlans.find(
      x =>
        String(x.id) ===
        String(planSelect.value)
    );


  if (!plan) {
    return;
  }


  const price =
    $('dataPrice');

  if (price) {

    /*
      dataPrice is hidden in the HTML,
      so use VALUE, not textContent.
    */

    price.value =
      plan.amount;
  }


  const details =
    $('dataPlanDetails');

  if (details) {

    details.textContent =
      `${plan.network} • ${plan.size} • ${plan.validity} • ${money(plan.amount)}`;
  }

}


/* =========================================
   DATA PLAN EVENTS
========================================= */

if ($('dPlan')) {

  $('dPlan').addEventListener(
    'change',
    updateSelectedDataPlan
  );
}


if ($('dNetwork')) {

  $('dNetwork').addEventListener(
    'change',
    filterDataPlans
  );
}


if ($('dCategory')) {

  $('dCategory').addEventListener(
    'change',
    filterDataPlans
  );
}


/* =========================================
   NAVIGATION
========================================= */

function nav(pageName) {

  document
    .querySelectorAll('.page')
    .forEach(page => {
      page.classList.add('hidden');
    });


  const page =
    $(pageName);

  if (page) {

    page.classList.remove(
      'hidden'
    );
  }


  document
    .querySelectorAll('.tab')
    .forEach(tab => {

      tab.classList.toggle(
        'active',
        tab.dataset.page === pageName
      );

    });


  if (pageName === 'data') {

    if (!dataPlans.length) {
      loadDataPlans();
    } else {
      filterDataPlans();
    }
  }
}


/* =========================================
   LOGIN / SIGN UP
========================================= */

if ($('authBtn')) {

  $('authBtn').onclick =
    async () => {

      const email =
        $('email')
          .value
          .trim()
          .toLowerCase();

      const password =
        $('password').value;


      if (!email || !password) {

        return msg(
          'Please enter your email and password.'
        );
      }


      if (
        signup &&
        $('name') &&
        !$('name').value.trim()
      ) {

        return msg(
          'Please enter your full name.'
        );
      }


      try {

        $('authBtn').disabled =
          true;

        $('authBtn').textContent =
          signup
            ? 'Creating account...'
            : 'Logging in...';


        /* SIGN UP */

        if (signup) {

          const name =
            $('name')
              .value
              .trim();


          const response =
            await fetch(
              `${BACKEND_URL}/users`,
              {
                method: 'POST',

                headers: {
                  'Content-Type':
                    'application/json'
                },

                body:
                  JSON.stringify({
                    name,
                    email,
                    password
                  })
              }
            );


          const data =
            await response.json();


          if (
            !response.ok ||
            !data.success
          ) {

            return msg(
              data.error ||
              'Could not create your account.'
            );
          }


          s.logged = true;

          s.user =
            data.user;

          s.balance =
            Number(
              data.wallet?.balance
            ) || 0;


          save();

          msg(
            'Account created successfully.'
          );

          nav('home');

          await loadDataPlans();

          return;
        }


        /* LOGIN */

        const response =
          await fetch(
            `${BACKEND_URL}/login`,
            {
              method: 'POST',

              headers: {
                'Content-Type':
                  'application/json'
              },

              body:
                JSON.stringify({
                  email,
                  password
                })
            }
          );


        const data =
          await response.json();


        if (
          !response.ok ||
          !data.success
        ) {

          return msg(
            data.error ||
            'Invalid email or password.'
          );
        }


        s.logged = true;

        s.user =
          data.user;

        s.balance =
          Number(
            data.wallet?.balance
          ) || 0;


        save();

        msg(
          'Logged in successfully.'
        );

        nav('home');

        await loadWallet();

        await loadDataPlans();


      } catch (error) {

        console.error(
          'Authentication error:',
          error
        );

        msg(
          'Unable to connect to the server.'
        );

      } finally {

        $('authBtn').disabled =
          false;

        $('authBtn').textContent =
          signup
            ? 'Sign up'
            : 'Log in';
      }
    };
}


/* =========================================
   SWITCH LOGIN / SIGN UP
========================================= */

if ($('switch')) {

  $('switch').onclick =
    () => {

      signup =
        !signup;


      if ($('authTitle')) {

        $('authTitle').textContent =
          signup
            ? 'Create an account'
            : 'Welcome back';
      }


      $('authBtn').textContent =
        signup
          ? 'Sign up'
          : 'Log in';


      $('switch').textContent =
        signup
          ? 'Already have an account? Log in'
          : 'Create an account';


      if ($('name')) {

        $('name').classList.toggle(
          'hidden',
          !signup
        );
      }
    };
}


/* =========================================
   LOGOUT
========================================= */

if ($('logout')) {

  $('logout').onclick =
    () => {

      s.logged = false;

      s.user = null;

      save();

      nav('home');

      msg(
        'Logged out.'
      );
    };
}


/* =========================================
   PAYSTACK VERIFICATION
========================================= */

async function verifyPayment(reference) {

  try {

    msg(
      'Verifying your payment...'
    );


    const response =
      await fetch(
        `${BACKEND_URL}/verify-payment/${encodeURIComponent(reference)}`
      );


    const data =
      await response.json();


    if (
      !response.ok ||
      !data.success
    ) {

      msg(
        data.message ||
        data.error ||
        'Payment was not successful.'
      );

      return;
    }


    const amount =
      Number(data.amount);


    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return;
    }


    if (
      s.history.some(
        x =>
          x.reference ===
          data.reference
      )
    ) {

      await loadWallet();

      return;
    }


    await loadWallet();


    s.history.unshift({

      type:
        'Wallet Funding',

      details:
        `Paystack Card • ${data.email || 'Payment successful'}`,

      amount:
        amount,

      reference:
        data.reference
    });


    save();

    nav('wallet');

    msg(
      `${money(amount)} added to your wallet.`
    );


  } catch (error) {

    console.error(
      error
    );

    msg(
      'Unable to verify payment.'
    );
  }
}


/* =========================================
   PAYMENT RETURN
========================================= */

async function checkPaymentReturn() {

  const params =
    new URLSearchParams(
      window.location.search
    );


  const reference =
    params.get('reference') ||
    params.get('trxref');


  if (!reference) {
    return;
  }


  window.history.replaceState(
    {},
    document.title,
    window.location.pathname
  );


  await verifyPayment(
    reference
  );
}


/* =========================================
   FUND WALLET
========================================= */

async function fund() {

  const email =
    s.user?.email ||
    $('email')?.value.trim();


  const amount =
    Number(
      $('fundAmount')?.value
    );


  if (
    !Number.isFinite(amount) ||
    amount < 100
  ) {

    return msg(
      'Minimum amount is ₦100.'
    );
  }


  if (!email) {

    return msg(
      'Please log in first.'
    );
  }


  try {

    msg(
      'Connecting to Paystack...'
    );


    const response =
      await fetch(
        `${BACKEND_URL}/initialize-payment`,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json'
          },

          body:
            JSON.stringify({
              email,
              amount
            })
        }
      );


    const data =
      await response.json();


    if (
      data.status &&
      data.data?.authorization_url
    ) {

      window.location.href =
        data.data.authorization_url;

    } else {

      msg(
        data.error ||
        'Payment could not be started.'
      );
    }


  } catch (error) {

    console.error(
      error
    );

    msg(
      'Unable to connect to payment server.'
    );
  }
}


/* =========================================
   TRANSFER UI
========================================= */

function createTransferUI() {

  const walletSection =
    $('wallet');

  if (
    !walletSection ||
    $('transferArea')
  ) {
    return;
  }


  const area =
    document.createElement('div');

  area.id =
    'transferArea';

  area.style.marginTop =
    '20px';


  area.innerHTML = `

    <hr>

    <h3>Bank Transfer</h3>

    <p>
      Fund your wallet by bank transfer.
    </p>

    <button
      id="transferBtn"
      class="secondary"
      type="button"
    >
      Pay by Bank Transfer
    </button>

    <div
      id="transferDetails"
      style="margin-top:15px;"
    ></div>

  `;


  const card =
    walletSection.querySelector(
      '.card'
    );


  if (card) {
    card.appendChild(area);
  }


  if ($('transferBtn')) {

    $('transferBtn').onclick =
      initializeTransfer;
  }
}


/* =========================================
   INITIALIZE TRANSFER
========================================= */

async function initializeTransfer() {

  const email =
    s.user?.email;


  const amount =
    Number(
      $('fundAmount')?.value
    );


  if (
    !Number.isFinite(amount) ||
    amount < 100
  ) {

    return msg(
      'Minimum amount is ₦100.'
    );
  }


  if (!email) {

    return msg(
      'Please log in first.'
    );
  }


  try {

    $('transferBtn').disabled =
      true;

    $('transferBtn').textContent =
      'Creating transfer...';


    const response =
      await fetch(
        `${BACKEND_URL}/initialize-transfer`,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json'
          },

          body:
            JSON.stringify({
              email,
              amount
            })
        }
      );


    const data =
      await response.json();


    if (
      !response.ok ||
      !data.status ||
      !data.data
    ) {

      throw new Error(
        data.error ||
        'Transfer could not be created.'
      );
    }


    showTransferDetails(
      data.data
    );


    msg(
      'Transfer account created.'
    );


    startTransferChecking(
      data.data.reference
    );


  } catch (error) {

    console.error(
      error
    );

    msg(
      error.message ||
      'Unable to create transfer.'
    );


  } finally {

    if ($('transferBtn')) {

      $('transferBtn').disabled =
        false;

      $('transferBtn').textContent =
        'Pay by Bank Transfer';
    }
  }
}


/* =========================================
   SHOW TRANSFER DETAILS
========================================= */

function showTransferDetails(data) {

  const box =
    $('transferDetails');

  if (!box) {
    return;
  }


  box.innerHTML = `

    <div class="card">

      <h3>
        Transfer Details
      </h3>

      <p>
        <b>Bank:</b>
        ${data.bank_name || 'Unavailable'}
      </p>

      <p>
        <b>Account name:</b>
        ${data.account_name || 'Unavailable'}
      </p>

      <p>
        <b>Account number:</b>
        ${data.account_number || 'Unavailable'}
      </p>

      <p>
        <b>Amount:</b>
        ${money(data.amount)}
      </p>

      <p class="muted">
        Transfer the exact amount shown above.
      </p>

      <p id="transferStatus">
        Waiting for transfer confirmation...
      </p>

    </div>

  `;
}


/* =========================================
   TRANSFER CHECK
========================================= */

function startTransferChecking(reference) {

  if (transferTimer) {

    clearInterval(
      transferTimer
    );
  }


  let attempts = 0;


  transferTimer =
    setInterval(
      async () => {

        attempts++;


        if (attempts > 60) {

          clearInterval(
            transferTimer
          );

          transferTimer = null;

          return;
        }


        await verifyTransfer(
          reference
        );

      },
      5000
    );
}


/* =========================================
   VERIFY TRANSFER
========================================= */

async function verifyTransfer(reference) {

  try {

    const response =
      await fetch(
        `${BACKEND_URL}/verify-transfer/${encodeURIComponent(reference)}`
      );


    const data =
      await response.json();


    if (!response.ok) {
      return;
    }


    const status =
      $('transferStatus');


    if (data.success) {

      if (transferTimer) {

        clearInterval(
          transferTimer
        );

        transferTimer = null;
      }


      const amount =
        Number(data.amount);


      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        return;
      }


      if (
        s.history.some(
          x =>
            x.reference ===
            data.reference
        )
      ) {

        await loadWallet();

        return;
      }


      await loadWallet();


      s.history.unshift({

        type:
          'Wallet Funding',

        details:
          'Bank Transfer',

        amount:
          amount,

        reference:
          data.reference
      });


      save();


      if (status) {

        status.textContent =
          `${money(amount)} added to your wallet.`;
      }


      msg(
        `${money(amount)} added to your wallet.`
      );
    }


  } catch (error) {

    console.error(
      'Transfer verification:',
      error
    );
  }
}


/* =========================================
   FUND BUTTON
========================================= */

if ($('fund')) {

  $('fund').onclick =
    () => {

      nav('wallet');

      setTimeout(() => {

        $('fundAmount')?.focus();

      }, 100);
    };
}


if ($('fund2')) {

  $('fund2').onclick =
    fund;
}


/* =========================================
   AIRTIME
========================================= */

if ($('buyAirtime')) {

  $('buyAirtime').onclick =
    () => {

      const phone =
        $('aPhone').value.trim();

      const amount =
        Number(
          $('aAmount').value
        );


      if (
        !phone ||
        !Number.isFinite(amount) ||
        amount < 50
      ) {

        return msg(
          'Enter a valid phone number and amount.'
        );
      }


      if (
        amount > s.balance
      ) {

        return msg(
          'Insufficient wallet balance.'
        );
      }


      s.balance -= amount;


      s.history.unshift({

        type:
          'Airtime',

        details:
          `${$('aNetwork').value} • ${phone}`,

        amount:
          -amount
      });


      save();


      msg(
        'Airtime purchase recorded.'
      );
    };
}


/* =========================================
   DATA PURCHASE
========================================= */

if ($('buyData')) {

  $('buyData').onclick =
    async () => {

      const phone =
        $('dPhone')
          .value
          .trim();


      const planId =
        $('dPlan')
          ? $('dPlan').value
          : '';


      if (!phone) {

        return msg(
          'Enter a phone number.'
        );
      }


      if (!planId) {

        return msg(
          'Please select a data plan.'
        );
      }


      const plan =
        dataPlans.find(
          x =>
            String(x.id) ===
            String(planId)
        );


      if (!plan) {

        return msg(
          'Selected data plan is not available.'
        );
      }


      const amount =
        Number(plan.amount);


      if (
        amount > Number(s.balance)
      ) {

        return msg(
          'Insufficient wallet balance.'
        );
      }


      try {

        $('buyData').disabled =
          true;

        $('buyData').textContent =
          'Processing...';


        const response =
          await fetch(
            `${BACKEND_URL}/purchase-data`,
            {
              method: 'POST',

              headers: {
                'Content-Type':
                  'application/json'
              },

              body:
                JSON.stringify({

                  email:
                    s.user?.email,

                  phone:
                    phone,

                  planId:
                    plan.id

                })
            }
          );


        const data =
          await response.json();


        console.log(
          'Purchase response:',
          data
        );


        if (
          !response.ok ||
          !data.success
        ) {

          return msg(
            data.error ||
            'Data purchase failed.'
          );
        }


        if (data.wallet) {

          s.balance =
            Number(
              data.wallet.balance
            ) || 0;

        } else {

          await loadWallet();
        }


        s.history.unshift({

          type:
            'Data',

          details:
            `${plan.network} • ${plan.size} • ${phone}`,

          amount:
            -amount,

          reference:
            data.reference
        });


        save();


        nav('history');


        msg(
          'Data purchase submitted successfully.'
        );


      } catch (error) {

        console.error(
          'Data purchase error:',
          error
        );

        msg(
          'Unable to connect to data service.'
        );


      } finally {

        $('buyData').disabled =
          false;

        $('buyData').textContent =
          'Buy Data';
      }
    };
}


/* =========================================
   NAVIGATION TABS
========================================= */

document
  .querySelectorAll('.tab')
  .forEach(tab => {

    tab.onclick =
      () =>
        nav(
          tab.dataset.page
        );

  });


/* =========================================
   HOME SERVICE BUTTONS
========================================= */

document
  .querySelectorAll('[data-go]')
  .forEach(button => {

    button.onclick =
      () =>
        nav(
          button.dataset.go
        );

  });


/* =========================================
   START
========================================= */

render();

createTransferUI();

loadDataPlans();

checkPaymentReturn();


if (s.logged) {

  loadWallet();
}

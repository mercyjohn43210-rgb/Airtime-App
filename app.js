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

const money = n =>
  '₦' +
  Number(n).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

function save() {
  localStorage.setItem(
    'jm_airtime',
    JSON.stringify(s)
  );

  render();
}

function msg(x) {
  const toast = $('toast');

  if (!toast) return;

  toast.textContent = x;
  toast.style.display = 'block';

  setTimeout(() => {
    toast.style.display = 'none';
  }, 2200);
}

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
        ? s.history
            .map(
              x =>
                `<div class="history">
                  <b>${x.type}</b><br>
                  <span class="muted">${x.details}</span><br>
                  ${money(x.amount)}
                </div>`
            )
            .join('')
        : '<p class="muted">No transactions yet.</p>';
  }
}


/* =========================================
   LOAD WALLET FROM BACKEND
========================================= */

async function loadWallet() {
  if (!s.user || !s.user.email) {
    return;
  }

  try {
    const email =
      encodeURIComponent(
        s.user.email
      );

    const response =
      await fetch(
        `${BACKEND_URL}/wallet/${email}`
      );

    const data =
      await response.json();

    console.log(
      'Wallet response:',
      data
    );

    if (
      !response.ok ||
      !data.success
    ) {
      console.error(
        'Could not load wallet:',
        data
      );

      return;
    }

    s.balance =
      Number(
        data.wallet.balance
      ) || 0;

    save();

  } catch (error) {
    console.error(
      'Wallet loading error:',
      error
    );
  }
}


/* =========================================
   LOAD DATA PLANS
========================================= */

async function loadDataPlans() {
  try {
    const response =
      await fetch(
        `${BACKEND_URL}/data`
      );

    const data =
      await response.json();

    console.log(
      'Data plans response:',
      data
    );

    if (
      !response.ok ||
      !data.success ||
      !Array.isArray(data.plans)
    ) {
      throw new Error(
        data.error ||
        'Could not load data plans.'
      );
    }

    dataPlans =
      data.plans;

    populateDataPlans();

  } catch (error) {

    console.error(
      'Data plans loading error:',
      error
    );

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
    console.warn(
      'dPlan select not found.'
    );

    return;
  }

  planSelect.innerHTML = '';

  if (!dataPlans.length) {

    planSelect.innerHTML =
      '<option value="">No data plans available</option>';

    return;
  }

  /*
    Group plans by category
  */

  const categories = {
    regular: 'Regular Data',
    gift: 'Gift Data',
    corporate: 'Corporate Data'
  };

  Object.keys(categories).forEach(
    category => {

      const plans =
        dataPlans.filter(
          plan =>
            plan.category ===
            category
        );

      if (!plans.length) {
        return;
      }

      const group =
        document.createElement(
          'optgroup'
        );

      group.label =
        categories[category];

      plans.forEach(
        plan => {

          const option =
            document.createElement(
              'option'
            );

          option.value =
            plan.id;

          option.textContent =
            `${plan.name} — ${money(
              plan.amount
            )} — ${plan.validity}`;

          group.appendChild(
            option
          );
        }
      );

      planSelect.appendChild(
        group
      );
    }
  );

  updateSelectedDataPlan();
}


/* =========================================
   UPDATE SELECTED DATA PLAN
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
        x.id ===
        planSelect.value
    );

  if (!plan) {
    return;
  }

  console.log(
    'Selected data plan:',
    plan
  );

  /*
    If your HTML has a data price element,
    update it automatically.
  */

  const price =
    $('dataPrice');

  if (price) {
    price.textContent =
      money(plan.amount);
  }

  const details =
    $('dataPlanDetails');

  if (details) {

    details.textContent =
      `${plan.size} • ${plan.validity}`;
  }
}


/* =========================================
   DATA PLAN CHANGE
========================================= */

if ($('dPlan')) {

  $('dPlan').addEventListener(
    'change',
    updateSelectedDataPlan
  );
}


/* =========================================
   NAVIGATION
========================================= */

function nav(p) {

  document
    .querySelectorAll('.page')
    .forEach(x =>
      x.classList.add('hidden')
    );

  const page =
    $(p);

  if (page) {
    page.classList.remove(
      'hidden'
    );
  }

  document
    .querySelectorAll('.tab')
    .forEach(x =>
      x.classList.toggle(
        'active',
        x.dataset.page === p
      )
    );
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

      if (
        !email ||
        !password
      ) {

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


        /* =========================
           SIGN UP
        ========================= */

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
                    name:
                      name,

                    email:
                      email,

                    password:
                      password
                  })
              }
            );

          const data =
            await response.json();

          console.log(
            'Signup response:',
            data
          );

          if (
            !response.ok ||
            !data.success
          ) {

            return msg(
              data.error ||
              'Could not create your account.'
            );
          }

          s.logged =
            true;

          s.user =
            data.user;

          s.balance =
            Number(
              data.wallet?.balance
            ) || 0;

          save();

          $('password').value =
            '';

          msg(
            'Account created successfully.'
          );

          nav('home');

          return;
        }


        /* =========================
           LOGIN
        ========================= */

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
                  email:
                    email,

                  password:
                    password
                })
            }
          );

        const data =
          await response.json();

        console.log(
          'Login response:',
          data
        );

        if (
          !response.ok ||
          !data.success
        ) {

          return msg(
            data.error ||
            'Invalid email or password.'
          );
        }

        s.logged =
          true;

        s.user =
          data.user;

        s.balance =
          Number(
            data.wallet?.balance
          ) || 0;

        save();

        $('password').value =
          '';

        msg(
          'Logged in successfully.'
        );

        nav('home');

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
   SIGN UP / LOGIN SWITCH
========================================= */

if ($('switch')) {

  $('switch').onclick =
    () => {

      signup =
        !signup;

      $('authTitle').textContent =
        signup
          ? 'Create an account'
          : 'Welcome back';

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

      s.logged =
        false;

      s.user =
        null;

      save();

      msg(
        'Logged out.'
      );
    };
}


/* =========================================
   CARD PAYMENT VERIFICATION
========================================= */

async function verifyPayment(
  reference
) {

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

    if (!response.ok) {

      throw new Error(
        data.error ||
        'Verification failed.'
      );
    }

    if (!data.success) {

      msg(
        data.message ||
        'Payment was not successful.'
      );

      return;
    }

    const paidAmount =
      Number(
        data.amount
      );

    if (
      !Number.isFinite(
        paidAmount
      ) ||
      paidAmount <= 0
    ) {

      msg(
        'Invalid payment amount.'
      );

      return;
    }

    const alreadyCredited =
      s.history.some(
        transaction =>
          transaction.reference ===
          data.reference
      );

    if (
      alreadyCredited
    ) {

      await loadWallet();

      msg(
        'This payment has already been credited.'
      );

      return;
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
        'Wallet Funding',

      details:
        `Paystack Card • ${
          data.email ||
          'Payment successful'
        }`,

      amount:
        paidAmount,

      reference:
        data.reference
    });

    save();

    nav('wallet');

    msg(
      `${money(
        paidAmount
      )} has been added to your wallet.`
    );

  } catch (error) {

    console.error(
      'Payment verification error:',
      error
    );

    msg(
      'Unable to verify payment.'
    );
  }
}


/* =========================================
   CHECK CARD PAYMENT RETURN
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
   CARD FUNDING
========================================= */

async function fund() {

  const email =
    $('email')
      ? $('email').value.trim()
      : s.user?.email;

  const amountInput =
    $('fundAmount')
      .value
      .trim();

  if (!amountInput) {

    return msg(
      'Enter the amount you want to add.'
    );
  }

  const amount =
    Number(
      amountInput
    );

  if (
    !Number.isFinite(
      amount
    ) ||
    amount < 100
  ) {

    return msg(
      'Minimum amount is ₦100.'
    );
  }

  if (!email) {

    return msg(
      'Please enter your email address.'
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
              email:
                email,

              amount:
                amount
            })
        }
      );

    const data =
      await response.json();

    if (
      data.status &&
      data.data &&
      data.data.authorization_url
    ) {

      window.location.href =
        data.data.authorization_url;

    } else {

      console.error(
        data
      );

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
   CREATE TRANSFER UI
========================================= */

function createTransferUI() {

  const walletSection =
    $('wallet');

  if (!walletSection) {
    return;
  }

  if ($('transferArea')) {
    return;
  }

  const transferArea =
    document.createElement(
      'div'
    );

  transferArea.id =
    'transferArea';

  transferArea.style.marginTop =
    '20px';

  transferArea.innerHTML = `
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

    card.appendChild(
      transferArea
    );
  }

  if ($('transferBtn')) {

    $('transferBtn').onclick =
      initializeTransfer;
  }
}


/* =========================================
   INITIALIZE BANK TRANSFER
========================================= */

async function initializeTransfer() {

  const email =
    $('email')
      ? $('email').value.trim()
      : s.user?.email;

  const amountInput =
    $('fundAmount')
      .value
      .trim();

  if (!amountInput) {

    return msg(
      'Enter the amount you want to add.'
    );
  }

  const amount =
    Number(
      amountInput
    );

  if (
    !Number.isFinite(
      amount
    ) ||
    amount < 100
  ) {

    return msg(
      'Minimum amount is ₦100.'
    );
  }

  if (!email) {

    return msg(
      'Please enter your email address.'
    );
  }

  try {

    $('transferBtn').disabled =
      true;

    $('transferBtn').textContent =
      'Creating transfer...';

    msg(
      'Creating your transfer account...'
    );

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
              email:
                email,

              amount:
                amount
            })
        }
      );

    const data =
      await response.json();

    console.log(
      'Transfer response:',
      data
    );

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

    const transfer =
      data.data;

    showTransferDetails(
      transfer
    );

    msg(
      'Transfer account created.'
    );

    startTransferChecking(
      transfer.reference
    );

  } catch (error) {

    console.error(
      'Transfer initialization error:',
      error
    );

    msg(
      error.message ||
      'Unable to create transfer.'
    );

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

function showTransferDetails(
  data
) {

  const box =
    $('transferDetails');

  if (!box) {
    return;
  }

  const bank =
    data.bank_name ||
    'Bank information unavailable';

  const account =
    data.account_number ||
    'Account number unavailable';

  const accountName =
    data.account_name ||
    'Paystack Transfer Account';

  const amount =
    Number(
      data.amount
    ) || 0;

  const expires =
    data.expires_at
      ? new Date(
          data.expires_at
        ).toLocaleString(
          'en-NG'
        )
      : 'See payment instructions';

  box.innerHTML = `
    <div class="card">

      <h3>Transfer Details</h3>

      <p>
        <b>Bank:</b>
        ${bank}
      </p>

      <p>
        <b>Account name:</b>
        ${accountName}
      </p>

      <p>
        <b>Account number:</b>
        ${account}
      </p>

      <p>
        <b>Amount:</b>
        ${money(amount)}
      </p>

      <p class="muted">
        <b>Expires:</b>
        ${expires}
      </p>

      <p>
        Make the transfer from your bank app,
        then wait for Paystack to confirm it.
      </p>

      <p id="transferStatus">
        Waiting for transfer...
      </p>

    </div>
  `;
}


/* =========================================
   CHECK TRANSFER STATUS
========================================= */

function startTransferChecking(
  reference
) {

  if (!reference) {
    return;
  }

  if (transferTimer) {

    clearInterval(
      transferTimer
    );
  }

  let attempts =
    0;

  transferTimer =
    setInterval(
      async () => {

        attempts++;

        if (
          attempts > 60
        ) {

          clearInterval(
            transferTimer
          );

          transferTimer =
            null;

          msg(
            'Transfer check timed out. You can check again later.'
          );

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
   VERIFY BANK TRANSFER
========================================= */

async function verifyTransfer(
  reference
) {

  try {

    const response =
      await fetch(
        `${BACKEND_URL}/verify-transfer/${encodeURIComponent(reference)}`
      );

    const data =
      await response.json();

    console.log(
      'Transfer verification:',
      data
    );

    if (!response.ok) {
      return;
    }

    const statusBox =
      $('transferStatus');

    if (data.success) {

      if (transferTimer) {

        clearInterval(
          transferTimer
        );

        transferTimer =
          null;
      }

      const paidAmount =
        Number(
          data.amount
        );

      if (
        !Number.isFinite(
          paidAmount
        ) ||
        paidAmount <= 0
      ) {
        return;
      }

      const alreadyCredited =
        s.history.some(
          transaction =>
            transaction.reference ===
            data.reference
        );

      if (
        alreadyCredited
      ) {

        await loadWallet();

        if (statusBox) {

          statusBox.textContent =
            'Transfer already credited.';
        }

        return;
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
          'Wallet Funding',

        details:
          `Bank Transfer • ${
            data.email ||
            'Transfer successful'
          }`,

        amount:
          paidAmount,

        reference:
          data.reference
      });

      save();

      if (statusBox) {

        statusBox.textContent =
          `Transfer successful. ${money(
            paidAmount
          )} added to your wallet.`;
      }

      msg(
        `${money(
          paidAmount
        )} has been added to your wallet.`
      );

      return;
    }

    if (statusBox) {

      statusBox.textContent =
        'Waiting for transfer confirmation...';
    }

  } catch (error) {

    console.error(
      'Transfer verification error:',
      error
    );
  }
}


/* =========================================
   ADD MONEY BUTTONS
========================================= */

if ($('fund')) {

  $('fund').onclick =
    () => {

      nav('wallet');

      setTimeout(
        () => {

          if ($('fundAmount')) {
            $('fundAmount').focus();
          }

        },
        100
      );
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

      const p =
        $('aPhone')
          .value
          .trim();

      const a =
        Number(
          $('aAmount').value
        );

      if (
        !p ||
        !a ||
        a < 50
      ) {

        return msg(
          'Enter a valid phone number and amount.'
        );
      }

      if (
        a > s.balance
      ) {

        return msg(
          'Insufficient wallet balance.'
        );
      }

      /*
        NOTE:
        This still records airtime locally.
        Actual airtime delivery will need
        a VTU/provider API.
      */

      s.balance -=
        a;

      s.history.unshift({

        type:
          'Airtime',

        details:
          `${$('aNetwork').value} • ${p}`,

        amount:
          -a
      });

      save();

      msg(
        'Airtime purchase recorded.'
      );
    };
}


/* =========================================
   REAL DATA PURCHASE
========================================= */

if ($('buyData')) {

  $('buyData').onclick =
    async () => {

      const p =
        $('dPhone')
          .value
          .trim();

      const planId =
        $('dPlan')
          ? $('dPlan').value
          : '';

      if (!p) {

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
            x.id ===
            planId
        );

      if (!plan) {

        return msg(
          'Selected data plan is not available.'
        );
      }

      if (
        Number(plan.amount) >
        Number(s.balance)
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

        msg(
          'Processing data purchase...'
        );

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
                    p,

                  planId:
                    planId
                })
            }
          );

        const data =
          await response.json();

        console.log(
          'Data purchase response:',
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

        /*
          Backend has already deducted
          the wallet balance.
        */

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
            `${plan.network} • ${plan.name} • ${p}`,

          amount:
            -Number(plan.amount),

          reference:
            data.reference
        });

        save();

        nav('transactions');

        msg(
          `${plan.name} purchase submitted successfully.`
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
  .forEach(
    x => {

      x.onclick =
        () =>
          nav(
            x.dataset.page
          );
    }
  );


/* =========================================
   DATA-GO BUTTONS
========================================= */

document
  .querySelectorAll('[data-go]')
  .forEach(
    x => {

      x.onclick =
        () =>
          nav(
            x.dataset.go
          );
    }
  );


/* =========================================
   START APP
========================================= */

render();

createTransferUI();

loadDataPlans();

if (s.logged) {

  loadWallet();

  /*
    Load plans again after login
    so the Buy Data page is ready.
  */

  loadDataPlans();
}

checkPaymentReturn();

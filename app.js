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

const money = n =>
  '₦' +
  Number(n).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

function save() {
  localStorage.setItem('jm_airtime', JSON.stringify(s));
  render();
}

function msg(x) {
  $('toast').textContent = x;
  $('toast').style.display = 'block';

  setTimeout(() => {
    $('toast').style.display = 'none';
  }, 2200);
}

function render() {
  $('auth').classList.toggle('hidden', s.logged);
  $('app').classList.toggle('hidden', !s.logged);
  $('logout').classList.toggle('hidden', !s.logged);

  $('balance').textContent = money(s.balance);
  $('walletBalance').textContent = money(s.balance);

  $('transactions').innerHTML = s.history.length
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

function nav(p) {
  document
    .querySelectorAll('.page')
    .forEach(x => x.classList.add('hidden'));

  $(p).classList.remove('hidden');

  document
    .querySelectorAll('.tab')
    .forEach(x =>
      x.classList.toggle('active', x.dataset.page === p)
    );
}

/* LOGIN */
$('authBtn').onclick = () => {
  if (
    !$('email').value ||
    !$('password').value ||
    (signup && !$('name').value)
  ) {
    return msg('Please fill in all fields.');
  }

  s.logged = true;
  save();

  msg(signup ? 'Account created.' : 'Logged in.');
};

/* SWITCH LOGIN / SIGN UP */
$('switch').onclick = () => {
  signup = !signup;

  $('authTitle').textContent = signup
    ? 'Create an account'
    : 'Welcome back';

  $('authBtn').textContent = signup
    ? 'Sign up'
    : 'Log in';

  $('switch').textContent = signup
    ? 'Already have an account? Log in'
    : 'Create an account';

  $('name').classList.toggle('hidden', !signup);
};

/* LOGOUT */
$('logout').onclick = () => {
  s.logged = false;
  save();
};

/* =========================================
   PAYSTACK PAYMENT VERIFICATION
========================================= */

async function verifyPayment(reference) {
  try {
    msg('Verifying your payment...');

    const response = await fetch(
      `${BACKEND_URL}/verify-payment/${encodeURIComponent(reference)}`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Verification failed.');
    }

    if (!data.success) {
      msg(data.message || 'Payment was not successful.');
      return;
    }

    const paidAmount = Number(data.amount);

    if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
      msg('Invalid payment amount.');
      return;
    }

    /*
      Prevent the same Paystack reference from
      being credited more than once on this browser.
    */
    const alreadyCredited = s.history.some(
      transaction =>
        transaction.reference === data.reference
    );

    if (alreadyCredited) {
      msg('This payment has already been credited.');
      return;
    }

    /* CREDIT WALLET */
    s.balance += paidAmount;

    /* SAVE PAYMENT TO HISTORY */
    s.history.unshift({
      type: 'Wallet Funding',
      details: `Paystack • ${data.email || 'Payment successful'}`,
      amount: paidAmount,
      reference: data.reference
    });

    save();

    nav('wallet');

    msg(
      `${money(paidAmount)} has been added to your wallet.`
    );

  } catch (error) {
    console.error('Payment verification error:', error);
    msg('Unable to verify payment.');
  }
}

/* =========================================
   CHECK PAYSTACK RETURN
========================================= */

async function checkPaymentReturn() {
  const params = new URLSearchParams(
    window.location.search
  );

  const reference =
    params.get('reference') ||
    params.get('trxref');

  if (!reference) {
    return;
  }

  /*
    Remove the payment reference from the browser URL
    after reading it.
  */
  window.history.replaceState(
    {},
    document.title,
    window.location.pathname
  );

  await verifyPayment(reference);
}

/* =========================================
   FUND WALLET
========================================= */

async function fund() {
  const email = $('email').value.trim();
  const amountInput = $('fundAmount').value.trim();

  if (!amountInput) {
    return msg('Enter the amount you want to add.');
  }

  const amount = Number(amountInput);

  if (!Number.isFinite(amount) || amount < 100) {
    return msg('Minimum amount is ₦100.');
  }

  if (!email) {
    return msg('Please enter your email address.');
  }

  try {
    msg('Connecting to Paystack...');

    const response = await fetch(
      `${BACKEND_URL}/initialize-payment`,
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json'
        },

        body: JSON.stringify({
          email: email,
          amount: amount
        })
      }
    );

    const data = await response.json();

    if (
      data.status &&
      data.data &&
      data.data.authorization_url
    ) {
      window.location.href =
        data.data.authorization_url;
    } else {
      console.error(data);
      msg(
        data.error ||
        'Payment could not be started.'
      );
    }

  } catch (error) {
    console.error(error);
    msg('Unable to connect to payment server.');
  }
}

/* =========================================
   ADD MONEY
========================================= */

$('fund').onclick = () => {
  nav('wallet');

  setTimeout(() => {
    $('fundAmount').focus();
  }, 100);
};

$('fund2').onclick = fund;

/* =========================================
   AIRTIME
========================================= */

$('buyAirtime').onclick = () => {
  const p = $('aPhone').value.trim();
  const a = Number($('aAmount').value);

  if (!p || !a || a < 50) {
    return msg(
      'Enter a valid phone number and amount.'
    );
  }

  if (a > s.balance) {
    return msg('Insufficient wallet balance.');
  }

  s.balance -= a;

  s.history.unshift({
    type: 'Airtime',
    details: `${$('aNetwork').value} • ${p}`,
    amount: -a
  });

  save();

  msg('Airtime purchase recorded.');
};

/* =========================================
   DATA
========================================= */

$('buyData').onclick = () => {
  const p = $('dPhone').value.trim();
  const a = Number($('dPlan').value);

  if (!p) {
    return msg('Enter a phone number.');
  }

  if (a > s.balance) {
    return msg('Insufficient wallet balance.');
  }

  s.balance -= a;

  s.history.unshift({
    type: 'Data',
    details: `${$('dNetwork').value} • ${p}`,
    amount: -a
  });

  save();

  msg('Data purchase recorded.');
};

/* =========================================
   NAVIGATION
========================================= */

document
  .querySelectorAll('.tab')
  .forEach(x => {
    x.onclick = () => nav(x.dataset.page);
  });

document
  .querySelectorAll('[data-go]')
  .forEach(x => {
    x.onclick = () => nav(x.dataset.go);
  });

/* =========================================
   START APP
========================================= */

render();

/*
  Check whether Paystack has returned the
  user to the app with a payment reference.
*/
checkPaymentReturn();

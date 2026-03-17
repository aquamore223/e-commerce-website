const currencySettings = {
  currency: "USD",
  symbol: "$"
};

// Default rates
let exchangeRates = {
  USD: 1,
  EUR: 0.85,
  GBP: 0.73
};

// Fetch real rates (optional)
async function fetchExchangeRates() {
  try {
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    const data = await response.json();
    exchangeRates = data.rates;
    console.log('Exchange rates updated');
  } catch (error) {
    console.warn('Could not fetch exchange rates, using defaults');
  }
}

// Call this on app start
fetchExchangeRates();

function formatPrice(price) {
  let numericPrice;
  
  if (typeof price === 'string') {
    numericPrice = Number(price.replace(/[^0-9.]/g, ""));
  } else if (typeof price === 'number') {
    numericPrice = price;
  } else {
    numericPrice = 0;
  }
  
  if (isNaN(numericPrice)) {
    numericPrice = 0;
  }
  
  // Use exchange rate if available
  const rate = exchangeRates[currencySettings.currency] || 1;
  const converted = numericPrice * rate;

  return `${currencySettings.symbol}${converted.toFixed(2)}`;
}

window.formatPrice = formatPrice;
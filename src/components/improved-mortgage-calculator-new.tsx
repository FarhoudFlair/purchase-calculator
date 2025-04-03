import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';



// Responsive utility hook
// function useWindowSize() {
//   const [windowSize, setWindowSize] = useState({
//     width: typeof window !== 'undefined' ? window.innerWidth : 0,
//     height: typeof window !== 'undefined' ? window.innerHeight : 0,
//   });

  // useEffect(() => {
  //   function handleResize() {
  //     setWindowSize({
  //       width: window.innerWidth,
  //       height: window.innerHeight,
  //     });
  //   }
    
//     window.addEventListener("resize", handleResize);
//     handleResize(); // Call once on mount
    
//     return () => window.removeEventListener("resize", handleResize);
//   }, []);
  
//   return windowSize;
// }


const MortgageCalculator = () => {
  // Constants
  const PROVINCES = [
    { value: 'AB', label: 'Alberta' },
    { value: 'BC', label: 'British Columbia' },
    { value: 'MB', label: 'Manitoba' },
    { value: 'NB', label: 'New Brunswick' },
    { value: 'NL', label: 'Newfoundland and Labrador' },
    { value: 'NS', label: 'Nova Scotia' },
    { value: 'ON', label: 'Ontario' },
    { value: 'PE', label: 'Prince Edward Island' },
    { value: 'QC', label: 'Quebec' },
    { value: 'SK', label: 'Saskatchewan' },
    { value: 'NT', label: 'Northwest Territories' },
    { value: 'NU', label: 'Nunavut' },
    { value: 'YT', label: 'Yukon' }
  ];

  const MUNICIPALITIES = {
    'ON': [
      { value: 'ottawa', label: 'Ottawa' },
      { value: 'none', label: 'Other Ontario Cities' },
      { value: 'toronto', label: 'Toronto' }
    ],
    'BC': [
      { value: 'none', label: 'All Municipalities' }
    ],
    'QC': [
      { value: 'none', label: 'Outside Montreal' },
      { value: 'montreal', label: 'Montreal' }
    ],
    'NS': [
      { value: 'none', label: 'Outside Halifax' },
      { value: 'halifax', label: 'Halifax' }
    ],
    'default': [
      { value: 'none', label: 'All Municipalities' }
    ]
  };

  const PROPERTY_TYPES = [
    { value: 'detached', label: 'Detached House' },
    { value: 'semi', label: 'Semi-Detached' },
    { value: 'townhouse', label: 'Townhouse' },
    { value: 'condo', label: 'Condominium' }
  ];

  const PAYMENT_FREQUENCIES = React.useMemo(() => [
    { value: 'monthly', label: 'Monthly', paymentsPerYear: 12 },
    { value: 'biweekly', label: 'Bi-Weekly', paymentsPerYear: 26 },
    { value: 'accelerated_biweekly', label: 'Accelerated Bi-Weekly', paymentsPerYear: 26 },
    { value: 'weekly', label: 'Weekly', paymentsPerYear: 52 },
    { value: 'accelerated_weekly', label: 'Accelerated Weekly', paymentsPerYear: 52 }
  ], []);

  const AMORTIZATION_PERIODS = Array.from({ length: 26 }, (_, i) => i + 5)
    .filter(year => year <= 30)
    .map(year => ({ value: year, label: `${year} Years` }));

  const TERM_LENGTHS = Array.from({ length: 10 }, (_, i) => i + 1)
    .map(year => ({ value: year, label: `${year} Year${year > 1 ? 's' : ''}` }));

  // Add type for inputs state
  interface InputsState {
    purchasePrice: number;
    downPayment: number;
    downPaymentType: 'amount' | 'percent';
    province: string;
    municipality: string;
    propertyType: string;
    interestRate: number;
    amortizationPeriod: number;
    term: number;
    paymentFrequency: string;
    firstTimeBuyer: boolean;
    newlyBuiltHome: boolean;
    foreignBuyer: boolean;
    propertyTaxes: number;
    condoFees: number;
    homeInsurance: number;
    utilities: number;
    maintenance: number;
    extraPayment: number;
    paymentIncrease: number;
    annualPrepayment: number;
    legalFees: number;
    titleInsurance: number;
    homeInspection: number;
    appraisalFee: number;
    brokerageFee: number;
    lenderFee: number;
    movingCosts: number;
  }

  // Add type for results state
  interface ResultsState {
    mortgageAmount: number;
    downPaymentPercent: number;
    mortgageInsurance: number;
    totalMortgage: number;
    monthlyPayment: number;
    principalPerPayment: number;
    interestPerPayment: number;
    firstPrincipalPerPayment: number;
    firstInterestPerPayment: number;
    totalMonthlyExpenses: number;
    interestPaidOverTerm: number;
    balanceAtEndOfTerm: number;
    amortizationSchedule: Array<{
      year: number;
      startingBalance: number;
      principalPaid: number;
      interestPaid: number;
      extraPayments: number;
      endingBalance: number;
    }>;
    standardAmortizationSchedule: Array<{
      year: number;
      startingBalance: number;
      principalPaid: number;
      interestPaid: number;
      extraPayments: number;
      endingBalance: number;
    }>;
    effectiveAmortization: number;
    closingCosts: number;
    interestSavingsOverTerm: number;
    interestSavingsOverAmortization: number;
    timeShaved: number;
  }

  interface TaxInputArgs {
    purchasePrice: number;
    province: string;
    municipality: string; // e.g., 'toronto' for specific municipal LTT
    firstTimeBuyer: boolean;
    newlyBuiltHome: boolean; // Needed for some rebates
  }
  /**
 * Calculates Provincial (and applicable Municipal) Land Transfer Tax.
 * NOTE: Rates are examples and MUST be verified/updated.
 */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const calculateLTT = ({ purchasePrice, province, municipality }: TaxInputArgs): number => {
    let ltt = 0;

    switch (province) {
      case 'ON':
        // Ontario Provincial LTT (Marginal Rates - Example as of ~early 2025)
        if (purchasePrice > 400000) {
          ltt += (purchasePrice - 400000) * 0.02; // 2.0% on amount over 400k
        }
        if (purchasePrice > 2000000) {
          ltt += (purchasePrice - 2000000) * 0.005; // +0.5% (total 2.5%) on amount over 2M
        }
        if (purchasePrice > 250000) {
          ltt += Math.min(purchasePrice, 400000) * 0.015; // 1.5% on portion between 250k-400k
        }
        if (purchasePrice > 55000) {
          ltt += Math.min(purchasePrice, 250000) * 0.01; // 1.0% on portion between 55k-250k
        }
        ltt += Math.min(purchasePrice, 55000) * 0.005; // 0.5% on portion up to 55k

        // Toronto Municipal LTT (Example - check current rates)
        if (municipality === 'toronto') {
          // Similar marginal calculation as provincial, but with Toronto's rates
          // Add Toronto LTT calculation here... e.g.,
          if (purchasePrice > 2000000) ltt += (purchasePrice - 2000000) * 0.025;
          // ... add other brackets for Toronto ...
        }
        break;

      case 'BC':
        // British Columbia Property Transfer Tax (Marginal Rates - Example as of ~early 2025)
        ltt = 0;
        if (purchasePrice > 3000000) {
          ltt += (purchasePrice - 3000000) * 0.02; // +2% (total 5%) on portion over $3M
        }
        if (purchasePrice > 200000) {
          ltt += Math.min(purchasePrice, 3000000) * 0.02; // 2% on portion $200k-$3M
        }
        ltt += Math.min(purchasePrice, 200000) * 0.01; // 1% on the first $200k
        // BC has an additional rate for >$3M residential, check specifics
        break;

      // Add cases for other provinces (QC, AB, MB, SK, etc.) with their specific rules
      // Example: Alberta has no provincial LTT, but registration fees
      case 'AB':
        ltt = 0; // No LTT, but consider adding registration fees separately
        break;

      default:
        // Default or simplified fallback (use with caution)
        ltt = purchasePrice * 0.01; // Example: 1% fallback
        break;
    }

    return Math.round(ltt); // Round to nearest dollar
  };
  
  // Note: calculateLTT isn't directly called in this file but is used by the calculateLandTransferTax function further down
  // which calls this with specific arguments in the calculateMortgage function

    /**
   * Calculates First-Time Home Buyer Land Transfer Tax Rebates.
   * NOTE: Amounts/Rules are examples and MUST be verified/updated.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const calculateLTTRebate = ({ purchasePrice, province, municipality, firstTimeBuyer, lttAmount }: TaxInputArgs & { lttAmount: number }): number => {
    if (!firstTimeBuyer) return 0;

    let rebate = 0;

    switch (province) {
      case 'ON':
        // Ontario FTHB Rebate: Max $4000 (covers LTT on first $368,333)
        rebate = Math.min(lttAmount, 4000);
        // Toronto FTHB Rebate: Max $4475 (check current max)
        if (municipality === 'toronto') {
          // Calculate the Toronto portion of the LTT and find the rebate on that
          // This requires calculating Toronto LTT separately or estimating its portion.
          // Example simplified: Add Toronto max rebate potential
          // rebate += Math.min(lttAmount /* need Toronto LTT portion */, 4475); // Check Toronto rules carefully
        }
        break;

      case 'BC':
        // BC FTHB Rebate/Exemption (Example threshold ~500k, check current)
        const bcFthbThreshold = 500000; // Example value - CHECK CURRENT BC RULES
        const bcPartialThreshold = 525000; // Example value
        if (purchasePrice <= bcFthbThreshold) {
            rebate = lttAmount; // Full exemption up to threshold
        } else if (purchasePrice < bcPartialThreshold) {
            // Partial rebate calculation - check BC government for formula
            // Example: rebate = lttAmount * ( (bcPartialThreshold - purchasePrice) / (bcPartialThreshold - bcFthbThreshold) );
        }
        break;

      // Add cases for other provinces offering rebates (e.g., PEI, potentially others)

      default:
        rebate = 0;
        break;
    }

    return Math.round(rebate);
  };
  
  // Note: calculateLTTRebate isn't directly called in this file but is used by the landTransferTaxRebate calculation
  // in the calculateMortgage function to determine first-time homebuyer rebates

  // States
  const [inputs, setInputs] = useState<InputsState>({
    purchasePrice: 500000,
    downPayment: 100000,
    downPaymentType: 'amount',
    province: 'ON',
    municipality: 'ottawa',
    propertyType: 'detached',
    interestRate: 5.5,
    amortizationPeriod: 25,
    term: 5,
    paymentFrequency: 'monthly',
    firstTimeBuyer: true,
    newlyBuiltHome: false,
    foreignBuyer: false,
    propertyTaxes: 5000,
    condoFees: 0,
    homeInsurance: 1200,
    utilities: 0,
    maintenance: 1,
    extraPayment: 0,
    paymentIncrease: 0,
    annualPrepayment: 0,
    legalFees: 1500,
    titleInsurance: 300,
    homeInspection: 500,
    appraisalFee: 300,
    brokerageFee: 0,
    lenderFee: 0,
    movingCosts: 2000
  });

  const [results, setResults] = useState<ResultsState>({
    mortgageAmount: 0,
    downPaymentPercent: 0,
    mortgageInsurance: 0,
    totalMortgage: 0,
    monthlyPayment: 0,
    principalPerPayment: 0,
    interestPerPayment: 0,
    firstPrincipalPerPayment: 0,
    firstInterestPerPayment: 0,
    totalMonthlyExpenses: 0,
    interestPaidOverTerm: 0,
    balanceAtEndOfTerm: 0,
    amortizationSchedule: [],
    standardAmortizationSchedule: [],
    effectiveAmortization: 0,
    closingCosts: 0,
    interestSavingsOverTerm: 0,
    interestSavingsOverAmortization: 0,
    timeShaved: 0
  });

  const [activeTab, setActiveTab] = useState('summary');

  // Utility functions
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(value);
  };

  const formatPercent = (value: number) => {
    // Check if the value is already in percentage form (like 5.5 for 5.5%)
    // If so, don't divide by 100 again
    return new Intl.NumberFormat('en-CA', { 
      style: 'percent', 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }).format(value / 100);
   // return new Intl.NumberFormat('en-CA', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value / 100);
  };

  formatPercent(inputs.interestRate)
  // Using formatPercent instead of displayPercent throughout the code

  // Handle input changes
  // const handleInputChange = (name: string, value: string | number | boolean) => {
  //   // Handle empty string
  //   if (value === '') {
  //     setInputs(prev => ({ ...prev, [name]: '' }));
  //     return;
  //   }
    
  //   // For numeric fields
  //   if (typeof inputs[name as keyof typeof inputs] === 'number') {
  //     // Convert to number and prevent leading zeros
  //     const numericValue = typeof value === 'string' ? value.replace(/^0+(?=\d)/, '') : String(value);
  //     value = Number(numericValue);
  //   }
    
  //   const updatedInputs = { ...inputs, [name]: value };
  
  //   // Update related values
  //   if (name === 'purchasePrice' && inputs.downPaymentType === 'percent') {
  //     const purchasePrice = typeof value === 'number' ? value : 0;
  //     const downPaymentPercent = typeof inputs.downPayment === 'number' ? inputs.downPayment : 0;
  //     updatedInputs.downPayment = Math.round(purchasePrice * (downPaymentPercent / 100));
  //   } else if (name === 'downPayment') {
  //     if (inputs.downPaymentType === 'percent') {
  //       const numValue = Number(value);
  //       updatedInputs.downPayment = numValue > 100 ? 100 : numValue;
  //     } else {
  //       const purchasePrice = typeof inputs.purchasePrice === 'number' ? inputs.purchasePrice : 0;
  //       const numValue = Number(value);
  //       updatedInputs.downPayment = numValue > purchasePrice ? purchasePrice : numValue;
  //     }
  //   } else if (name === 'downPaymentType') {
  //     const purchasePrice = typeof inputs.purchasePrice === 'number' ? inputs.purchasePrice : 0;
  //     const downPayment = typeof inputs.downPayment === 'number' ? inputs.downPayment : 0;
  //     if (value === 'percent') {
  //       updatedInputs.downPayment = Number(((downPayment / purchasePrice) * 100).toFixed(2));
  //     } else {
  //       updatedInputs.downPayment = Math.round((purchasePrice * downPayment) / 100);
  //     }
  //   }

  //   if (name == 'purchasePrice' && inputs.downPaymentType == 'amount') {
  //     const purchasePrice = Number(value);
  //     if (inputs.downPayment > purchasePrice) {
  //       updatedInputs.downPayment = purchasePrice;
  //     }
  //   }
  
  //   setInputs(updatedInputs);
  // };

  // // Handle blur event
  // const handleBlur = (name: keyof typeof inputs) => {
  //   if (inputs[name] === '') {
  //     setInputs(prev => ({ ...prev, [name]: 0 }));
  //   }
  // };

 
  const handleInputChange = (name: keyof InputsState, value: string | number | boolean) => {
    // Create a copy of inputs for processing
    const updatedInputs = { ...inputs };

    // Handle input type conversion
    if (typeof updatedInputs[name] === 'number') {
      // Handle numeric fields
      const rawValue = String(value);
      if (rawValue === '' || /^-?\d*\.?\d*$/.test(rawValue)) {
        // Valid numeric input - for empty string, allow it in the UI but store as number type
        if (rawValue === '') {
          // Track empty input for display purposes, but store as empty string
          // We'll convert this to 0 on blur
          setInputs(prev => ({ ...prev, [name]: '' as unknown as number }));
          return; // Exit early after setting the temporary empty value
        } else {
          // Use type assertion to handle the TypeScript error
          (updatedInputs as Record<string, number | string | boolean>)[name] = Number(rawValue);
        }
      } else {
        // Invalid numeric input, ignore
        return;
      }
    } else {
      // Handle non-numeric fields (boolean, string)
      (updatedInputs as Record<string, number | string | boolean>)[name] = value;
    }

    // Handle special field relationships
    const purchasePrice = typeof updatedInputs.purchasePrice === 'number' ? updatedInputs.purchasePrice : 0;
    const downPayment = typeof updatedInputs.downPayment === 'number' ? updatedInputs.downPayment : 0;

    // Special case: Down payment type switching
    if (name === 'downPaymentType') {
      if (value === 'percent' && purchasePrice > 0) {
        // Convert from amount to percentage
        updatedInputs.downPayment = Math.round((downPayment / purchasePrice) * 100 * 100) / 100;
      } else if (value === 'amount') {
        // Convert from percentage to amount
        updatedInputs.downPayment = Math.round(purchasePrice * (downPayment / 100));
      }
    }
    // Special case: Purchase price update affects down payment amount if in percentage mode
    else if (name === 'purchasePrice' && updatedInputs.downPaymentType === 'percent' && purchasePrice > 0) {
      // No need to update down payment value here - the percentage remains the same
      // User will see the equivalent dollar amount in the display text
    }
    // Special case: Down payment input validation
    else if (name === 'downPayment') {
      if (updatedInputs.downPaymentType === 'percent') {
        // Cap percentage at 100%
        if (downPayment > 100) updatedInputs.downPayment = 100;
        // Floor at 0%
        if (downPayment < 0) updatedInputs.downPayment = 0;
      } else {
        // Cap amount at purchase price
        if (downPayment > purchasePrice) updatedInputs.downPayment = purchasePrice;
        // Floor at 0
        if (downPayment < 0) updatedInputs.downPayment = 0;
      }
    }

    // Update state with processed inputs
    setInputs(updatedInputs);
  };

  const handleBlur = (name: keyof InputsState) => {
    const currentValue = inputs[name];
    
    // Only process numeric fields
    if (typeof inputs[name as keyof typeof inputs] === 'number' || currentValue === '') {
      const valueAsString = String(currentValue).trim();
      
      // Check for empty or invalid numeric values
      if (valueAsString === '' || valueAsString === '.' || valueAsString === '-' || isNaN(parseFloat(valueAsString))) {
        // Set empty or invalid values to 0
        setInputs(prev => ({ ...prev, [name]: 0 as number }));
      } else {
        // Ensure the value is stored as a proper number
        const numericValue = parseFloat(valueAsString);
        
        // Only update if the parsed value differs from the current value
        if (numericValue !== currentValue) {
          setInputs(prev => ({ ...prev, [name]: numericValue }));
        }
      }
    }
    // We don't need special handling for non-numeric fields on blur
  };

  // Calculate payment amount
  const calculatePaymentAmount = (
    principal: number, 
    annualInterestRate: number, 
    amortizationYears: number, 
    paymentsPerYear: number, 
    isAccelerated: boolean = false
  ): number => {
    //const interestRate = typeof inputs.interestRate === 'number' ? inputs.interestRate : 0;
    //const annualInterestRate = interestRate / 100;
    //const paymentFrequencyObj = PAYMENT_FREQUENCIES.find(f => f.value === inputs.paymentFrequency);
    //const paymentsPerYear = paymentFrequencyObj?.paymentsPerYear || 12;
    const totalPayments = amortizationYears  * paymentsPerYear;
    const interestRatePerPayment = annualInterestRate / paymentsPerYear;

    // Base payment calculation
    let paymentAmount;
    if (annualInterestRate  === 0) {
      paymentAmount = principal / totalPayments;
    } else {
      paymentAmount = principal * 
        (interestRatePerPayment * Math.pow(1 + interestRatePerPayment, totalPayments)) / 
        (Math.pow(1 + interestRatePerPayment, totalPayments) - 1);
    }

    // If accelerated, adjust payment amount
    if (isAccelerated) {
      // For accelerated bi-weekly, take the monthly payment and divide by 2
      // For accelerated weekly, take the monthly payment and divide by 4
      const monthlyEquivalent = principal * 
        ((annualInterestRate/12) * Math.pow(1 + (annualInterestRate/12), amortizationYears * 12)) / 
        (Math.pow(1 + (annualInterestRate/12), amortizationYears * 12) - 1);
      //paymentAmount = monthlyEquivalent / 2;
    // } else if (inputs.paymentFrequency === 'accelerated_weekly') {
    //   const monthlyEquivalent = totalMortgage * 
    //     (annualInterestRate/12 * Math.pow(1 + annualInterestRate/12, inputs.amortizationPeriod * 12)) / 
    //     (Math.pow(1 + annualInterestRate/12, inputs.amortizationPeriod * 12) - 1);
    //   paymentAmount = monthlyEquivalent / 4;
      if (paymentsPerYear == 26) { // bi-weekly
        paymentAmount = monthlyEquivalent / 2;
      } else if (paymentsPerYear == 52) { // weekly
        paymentAmount = monthlyEquivalent / 4;
      }
    }
        
    return paymentAmount;
  };

   // Calculate mortgage
   const calculateMortgage = useCallback(() => {
    // Calculate down payment amount and percentage
    let downPaymentAmount, downPaymentPercent;
    const purchasePrice = typeof inputs.purchasePrice === 'number' ? inputs.purchasePrice : 0;

    if (inputs.downPaymentType === 'amount') {
      downPaymentAmount = typeof inputs.downPayment === 'number' ? inputs.downPayment : 0;
      downPaymentPercent = (downPaymentAmount / purchasePrice) * 100;
    } else {
      downPaymentPercent = typeof inputs.downPayment === 'number' ? inputs.downPayment : 0;
      downPaymentAmount = (purchasePrice * downPaymentPercent) / 100;
    }

    let minimumDownPaymentRequired: number;
    if (inputs.foreignBuyer) {
      // Foreign Buyer minimum percentage (e.g., 35% - VERIFY current rules)
      // Note: Rules for foreign buyers can be complex and vary.
      minimumDownPaymentRequired = purchasePrice * 0.35;
    } else {
      // Standard Canadian Minimum Down Payment Rules (~Mar 2025 - VERIFY rules)

      if (purchasePrice <= 500000) {
          // Tier 1: Price <= $500k requires 5% down.
          minimumDownPaymentRequired = purchasePrice * 0.05;

      } else if (purchasePrice > 500000 && purchasePrice <= 1000000) {
          // Tier 2: Price > $500k and <= $1M requires 5% on the first $500k
          //         plus 10% on the portion above $500k.
          const firstPortionDownPayment = 500000 * 0.05; // $25,000
          const secondPortionAmount = purchasePrice - 500000;
          const secondPortionDownPayment = secondPortionAmount * 0.10;
          minimumDownPaymentRequired = firstPortionDownPayment + secondPortionDownPayment;

      } else { // purchasePrice > 1,000,000
          // Tier 3: Price > $1M requires 20% down.
          // Mortgage default insurance is generally not available for homes > $1M.
          minimumDownPaymentRequired = purchasePrice * 0.20;
      }
    }
    minimumDownPaymentRequired = Math.max(0, Math.round(minimumDownPaymentRequired));

    // Ensure down payment meets minimum requirements
    // const minimumDownPaymentPercent = inputs.foreignBuyer ? 35 : 
    //   (purchasePrice <= 500000 ? 5 :
    //    purchasePrice <= 1000000 ? ((purchasePrice - 500000) * 0.1 + 25000) / purchasePrice * 100 : 20);
    
    // const minimumDownPayment = (minimumDownPaymentPercent / 100) * purchasePrice;

    const actualDownPayment = Math.max(downPaymentAmount, minimumDownPaymentRequired);
    const actualDownPaymentPercent = purchasePrice > 0 ? (actualDownPayment / purchasePrice) * 100 : 0; //(actualDownPayment / purchasePrice) * 100;
    
    // Calculate mortgage insurance (if down payment < 20%)
    let mortgageInsurance = 0;
    if (actualDownPaymentPercent < 20) {
      const loanToValue = 100 - actualDownPaymentPercent;
      
      let insuranceRate = 0;
      if (loanToValue > 95) {
        insuranceRate = 4.0;
      } else if (loanToValue > 90) {
        insuranceRate = 3.1;
      } else if (loanToValue > 85) {
        insuranceRate = 2.8;
      } else if (loanToValue > 80) {
        insuranceRate = 2.4;
      }
      
      const baseAmount = purchasePrice - actualDownPayment;
      mortgageInsurance = baseAmount * (insuranceRate / 100);
    }

    let pstOnInsurance = 0;
    const province = inputs.province;

    if (mortgageInsurance > 0) {
      let pstRate = 0;
      switch (province) {
        case 'ON':
          pstRate = 0.08; // 8% Retail Sales Tax (RST) in Ontario - CHECK CURRENT RATE
          break;
      case 'QC':
          pstRate = 0.09975; // 9.975% Quebec Sales Tax (QST) - CHECK CURRENT RATE
          break;
      case 'SK':
          pstRate = 0.06; // 6% Provincial Sales Tax (PST) in Saskatchewan - CHECK CURRENT RATE
          break;
      // MB used to charge PST but might have stopped - VERIFY
      // default: 0%
      }
      pstOnInsurance = mortgageInsurance * pstRate;
    }

    // Calculate total mortgage amount
    const mortgageAmount = purchasePrice - actualDownPayment;
    const totalMortgage = mortgageAmount + mortgageInsurance;

    // Calculate payment amount using the new standardized function
    const interestRate = typeof inputs.interestRate === 'number' ? inputs.interestRate : 0;
    const annualInterestRate = interestRate / 100;
    const paymentFrequencyObj = PAYMENT_FREQUENCIES.find(f => f.value === inputs.paymentFrequency);
    const paymentsPerYear = paymentFrequencyObj?.paymentsPerYear || 12;

    // Determine if payment is accelereated
    const isAccelerated =
      inputs.paymentFrequency == 'accelerated_biweekly' ||
      inputs.paymentFrequency == 'accelereated_weekly';


    // Calculate the payment amount using our helper function
    const paymentAmount = calculatePaymentAmount(
      totalMortgage,
      annualInterestRate,
      inputs.amortizationPeriod,
      paymentsPerYear,
      isAccelerated
    );

    // Calculate monthly equivalent payment for expense summaries
    const monthlyPayment = inputs.paymentFrequency === 'monthly' 
      ? paymentAmount 
      : paymentAmount * paymentsPerYear / 12;

    // Generate amortization schedule
    const generateAmortizationSchedule = (
      principal: number,
      annualInterestRate: number,
      amortizationYears: number,
      paymentAmount: number,
      paymentsPerYear: number,
      term: number,
      extraPayment: number,
      paymentIncrease: number,
      annualPrepayment: number
    ) => {
      const interestRatePerPayment = (annualInterestRate / 100) / paymentsPerYear;
      let balance = principal;
      let totalInterestPaid = 0;
      const yearlySchedule = [];
      let totalInterestPaidOverTerm = 0;
      let balanceAtEndOfTerm = 0;
      let lastPaymentNumber = 0;
      
      // Calculate adjusted payment with increase
     // const adjustedPayment = paymentAmount * (1 + paymentIncrease / 100);
      
      // Process each year
      for (let year = 1; year <= amortizationYears; year++) {
        let yearlyPrincipalPaid = 0;
        let yearlyInterestPaid = 0;
        let yearlyExtraPayments = 0;
         // Calculate payment for this year with compounding annual increase
        const yearlyAdjustedPayment = paymentAmount * Math.pow(1 + paymentIncrease / 100, year - 1);

        // Process each payment in the year
        for (let i = 1; i <= paymentsPerYear; i++) {
          lastPaymentNumber++;
          if (balance <= 0) break;
          
          // Calculate interest and principal for this payment
          const interestForPayment = balance * interestRatePerPayment;
          let principalForPayment = Math.min(yearlyAdjustedPayment - interestForPayment, balance);
          
          // Add extra payment if specified
          let extraPrincipalPaid = 0;
          if (extraPayment > 0) {
            extraPrincipalPaid = Math.min(extraPayment, balance - principalForPayment);
            principalForPayment += extraPrincipalPaid;
            yearlyExtraPayments += extraPrincipalPaid;
          }
          
          // Update balance
          balance -= principalForPayment;
          
          // Update yearly totals
          yearlyPrincipalPaid += principalForPayment;
          yearlyInterestPaid += interestForPayment;
          totalInterestPaid += interestForPayment;
          
          // Record balance at end of term
          if (year === term && i === paymentsPerYear) {
            balanceAtEndOfTerm = balance;
            totalInterestPaidOverTerm = totalInterestPaid;
          }
        }
        
        // Apply annual prepayment if specified
        if (annualPrepayment > 0 && balance > 0) {
          const annualPrepaymentAmount = Math.min(
            principal * (annualPrepayment / 100),
            balance
          );
          balance -= annualPrepaymentAmount;
          yearlyPrincipalPaid += annualPrepaymentAmount;
          yearlyExtraPayments += annualPrepaymentAmount;
        }
        
        const startingBalanceForYear = balance; // Capture balance before year's payments

        // Add year to schedule
        yearlySchedule.push({
          year,
          startingBalance: startingBalanceForYear, //principal - yearlyPrincipalPaid + yearlyInterestPaid + balance,
          principalPaid: yearlyPrincipalPaid,
          interestPaid: yearlyInterestPaid,
          extraPayments: yearlyExtraPayments,
          endingBalance: balance
        });
        
        if (balance <= 0) break;
      }
      
      // Calculate effective amortization in years
      const effectiveAmortizationYears = lastPaymentNumber / paymentsPerYear;
      
      return {
        yearlySchedule,
        totalInterestPaid,
        totalInterestPaidOverTerm,
        balanceAtEndOfTerm,
        effectiveAmortizationYears
      };
    };

    // Calculate standard schedule (without prepayments)
    const standardSchedule = generateAmortizationSchedule(
      totalMortgage, 
      interestRate, 
      inputs.amortizationPeriod, 
      paymentAmount, 
      paymentsPerYear, 
      inputs.term,
      0, 0, 0
    );
    
    // Store original data for comparison
    const originalInterestPaid = standardSchedule.totalInterestPaid;
    const originalAmortization = inputs.amortizationPeriod;
    
    // Generate schedule with prepayments
    const schedule = generateAmortizationSchedule(
      totalMortgage, 
      interestRate, 
      inputs.amortizationPeriod, 
      paymentAmount, 
      paymentsPerYear, 
      inputs.term,
      inputs.extraPayment,
      inputs.paymentIncrease,
      inputs.annualPrepayment
    );

    // Calculate monthly expenses
    const propertyTaxes = typeof inputs.propertyTaxes === 'number' ? inputs.propertyTaxes : 0;
    const condoFees = typeof inputs.condoFees === 'number' ? inputs.condoFees : 0;
    const homeInsurance = typeof inputs.homeInsurance === 'number' ? inputs.homeInsurance : 0;
    const utilities = typeof inputs.utilities === 'number' ? inputs.utilities : 0;
    const maintenance = typeof inputs.maintenance === 'number' ? inputs.maintenance : 0;
    
    const monthlyPropertyTaxes = propertyTaxes / 12;
    const monthlyHomeInsurance = homeInsurance / 12;
    const monthlyMaintenance = (purchasePrice * (maintenance / 100)) / 12;
    
    const totalMonthlyExpenses = 
      monthlyPayment + 
      monthlyPropertyTaxes + 
      condoFees +
      monthlyHomeInsurance + 
      utilities + 
      monthlyMaintenance;
    
    // Calculate closing costs
    const calculateLandTransferTax = (price: number, province: string) => {
      if (province === 'ON') {
        // Ontario tiered calculation
        const brackets = [
          { max: 55000, rate: 0.005 },
          { max: 250000, rate: 0.01 },
          { max: 400000, rate: 0.015 },
          { max: Infinity, rate: 0.02 }
        ];
        
        let tax = 0;
        let remaining = price;
        
        for (const bracket of brackets) {
          if (remaining <= 0) break;
          const taxable = Math.min(remaining, bracket.max);
          tax += taxable * bracket.rate;
          remaining -= taxable;
        }
        
        return tax;
      }
      
      // Default calculation for other provinces
      return price * 0.015; // 1.5%
    };
    const landTransferTax = calculateLandTransferTax(purchasePrice, inputs.province); //purchasePrice * (inputs.province === 'ON' ? 0.02 : 0.015); // Simplified calculation
    const landTransferTaxRebate = inputs.firstTimeBuyer ? Math.min(4000, landTransferTax) : 0;
    
    const legalFees = typeof inputs.legalFees === 'number' ? inputs.legalFees : 0;
    const titleInsurance = typeof inputs.titleInsurance === 'number' ? inputs.titleInsurance : 0;
    const homeInspection = typeof inputs.homeInspection === 'number' ? inputs.homeInspection : 0;
    const appraisalFee = typeof inputs.appraisalFee === 'number' ? inputs.appraisalFee : 0;
    const brokerageFee = typeof inputs.brokerageFee === 'number' ? inputs.brokerageFee : 0;
    const lenderFee = typeof inputs.lenderFee === 'number' ? inputs.lenderFee : 0;
    const movingCosts = typeof inputs.movingCosts === 'number' ? inputs.movingCosts : 0;
    const foreignBuyerTax = inputs.foreignBuyer ? (purchasePrice * (inputs.province === 'ON' ? 0.25 : 0.20)) : 0;
    
    const closingCosts = Math.round(landTransferTax - landTransferTaxRebate + legalFees + titleInsurance + 
                       homeInspection + appraisalFee + brokerageFee + lenderFee + movingCosts + foreignBuyerTax + pstOnInsurance);

    // Calculate interest paid over term and balance at end of term
    const interestPaidOverTerm = schedule.totalInterestPaidOverTerm;
    const balanceAtEndOfTerm = schedule.balanceAtEndOfTerm;
    const effectiveAmortization = schedule.effectiveAmortizationYears;
    
    // Calculate interest savings
    const standardInterestPaidOverTerm = standardSchedule.totalInterestPaidOverTerm;
    const interestSavingsOverTerm = standardInterestPaidOverTerm - interestPaidOverTerm;
    const interestSavingsOverAmortization = originalInterestPaid - schedule.totalInterestPaid;
    const timeShaved = originalAmortization - effectiveAmortization;

    // Calculate principal and interest for the first payment
    const interestPerPayment = totalMortgage * ((annualInterestRate) / paymentsPerYear);
    const principalPerPayment = paymentAmount - interestPerPayment;
    const firstInterestPerPayment = totalMortgage * interestPerPayment;
    const firstPrincipalPerPayment = paymentAmount - firstInterestPerPayment;

    // Update results
    setResults({
      mortgageAmount,
      downPaymentPercent: actualDownPaymentPercent,
      mortgageInsurance,
      totalMortgage,
      monthlyPayment,
      principalPerPayment,
      interestPerPayment,
      firstPrincipalPerPayment,
      firstInterestPerPayment,
      totalMonthlyExpenses,
      interestPaidOverTerm,
      balanceAtEndOfTerm,
      amortizationSchedule: schedule.yearlySchedule,
      standardAmortizationSchedule: standardSchedule.yearlySchedule,
      effectiveAmortization,
      closingCosts,
      interestSavingsOverTerm,
      interestSavingsOverAmortization,
      timeShaved
    });
  }, [inputs, PAYMENT_FREQUENCIES]);

  // Calculate mortgage details whenever inputs change
  useEffect(() => {
    if (Object.values(inputs).some(value => value === '')) {
      return;
    }
    
    calculateMortgage();
  }, [inputs, calculateMortgage]);

  // Prepare data for payment breakdown chart
  const preparePaymentBreakdownData = () => {
    if (!results.amortizationSchedule || results.amortizationSchedule.length === 0) {
      return [];
    }
    
    return results.amortizationSchedule.map(item => ({
      year: item.year,
      principalPaid: item.principalPaid,
      interestPaid: item.interestPaid
    }));
  };

  return (
    <div className="bg-white shadow-lg rounded-xl p-3 md:p-6 w-full max-w-6xl mx-auto">
      <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-blue-800 mb-3 md:mb-6">
        Mortgage Calculator
      </h1>
      
      <div className="mb-4 md:mb-8">
        <div className="flex overflow-x-auto pb-1 -mx-3 px-3">
          <div className="flex space-x-1 md:space-x-2 border-b min-w-full">
            <button 
              className={`py-2 px-2 md:px-4 text-sm md:text-base font-medium whitespace-nowrap ${
                activeTab === 'summary' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-blue-500'
              }`}
              onClick={() => setActiveTab('summary')}
            >
              Summary
            </button>
            <button 
              className={`py-2 px-2 md:px-4 text-sm md:text-base font-medium whitespace-nowrap ${
                activeTab === 'expenses' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-blue-500'
              }`}
              onClick={() => setActiveTab('expenses')}
            >
              Monthly Expenses
            </button>
            <button 
              className={`py-2 px-2 md:px-4 text-sm md:text-base font-medium whitespace-nowrap ${
                activeTab === 'prepayment' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-blue-500'
              }`}
              onClick={() => setActiveTab('prepayment')}
            >
              Prepayment
            </button>
            <button 
              className={`py-2 px-2 md:px-4 text-sm md:text-base font-medium whitespace-nowrap ${
                activeTab === 'closingCosts' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-blue-500'
              }`}
              onClick={() => setActiveTab('closingCosts')}
            >
              Closing Costs
            </button>
            <button 
              className={`py-2 px-2 md:px-4 text-sm md:text-base font-medium whitespace-nowrap ${
                activeTab === 'amortization' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-blue-500'
              }`}
              onClick={() => setActiveTab('amortization')}
            >
              Amortization
            </button>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-3 gap-3 md:gap-6">
        <div className="lg:col-span-1 space-y-3 md:space-y-4 mb-4 lg:mb-0">
          {activeTab === 'summary' && (
            <>
              <div className="p-3 md:p-4 bg-gray-50 rounded shadow">
                <h2 className="text-lg font-semibold mb-3 md:mb-4 text-gray-800">Property Details</h2>
                
                <div className="mb-3 md:mb-4">
                  <label className="block text-xs md:text-sm font-medium mb-1 text-gray-700">
                    Purchase Price
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                    <input
                      type="number"
                      className="w-full pl-8 pr-2 py-2 text-sm md:text-base border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 text-black"
                      value={inputs.purchasePrice}
                      onChange={(e) => handleInputChange('purchasePrice', e.target.value)}
                      onBlur={() => handleBlur('purchasePrice')}
                    />
                  </div>
                </div>
                
                <div className="mb-3 md:mb-4">
                  <label className="block text-xs md:text-sm font-medium mb-1 text-gray-700">Down Payment</label>
                  <div className="flex space-x-2">
                    <div className="relative flex-1">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                        {inputs.downPaymentType === 'amount' ? '$' : '%'}
                      </span>
                      <input
                        type="number"
                        className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 text-black"
                        value={inputs.downPayment}
                        onChange={(e) => handleInputChange('downPayment', e.target.value)}
                        onBlur={() => handleBlur('downPayment')}
                      />
                    </div>
                    <select
                      className="border border-gray-300 rounded px-3 py-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                      value={inputs.downPaymentType}
                      onChange={(e) => handleInputChange('downPaymentType', e.target.value)}
                    >
                      <option value="amount">$</option>
                      <option value="percent">%</option>
                    </select>
                  </div>
                  <div className="mt-1 text-sm text-gray-600">
                    {inputs.downPaymentType === 'amount'
                      ? `(${(inputs.downPayment / inputs.purchasePrice * 100).toFixed(2)}%)`
                      : `(${formatCurrency(inputs.purchasePrice * inputs.downPayment / 100)})`
                    }
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs md:text-sm font-medium mb-1 text-gray-700">Province</label>
                    <select
                      className="w-full border border-gray-300 rounded px-3 py-2 md:py-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                      value={inputs.province}
                      onChange={(e) => {
                        const newProvince = e.target.value as keyof typeof MUNICIPALITIES;
                        const municipalitiesForProvince = MUNICIPALITIES[newProvince] || MUNICIPALITIES['default'];
                        handleInputChange('province', newProvince);
                        handleInputChange('municipality', municipalitiesForProvince[0].value);
                      }}
                    >
                      {PROVINCES.map(province => (
                        <option key={province.value} value={province.value}>{province.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs md:text-sm font-medium mb-1 text-gray-700">Municipality</label>
                    <select
                      className="w-full border border-gray-300 rounded px-3 py-2 md:py-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                      value={inputs.municipality}
                      onChange={(e) => handleInputChange('municipality', e.target.value)}
                    >
                      {(MUNICIPALITIES[inputs.province as keyof typeof MUNICIPALITIES] || MUNICIPALITIES['default']).map(municipality => (
                        <option key={municipality.value} value={municipality.value}>{municipality.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs md:text-sm font-medium mb-1 text-gray-700">Property Type</label>
                  <select
                    className="w-full border border-gray-300 rounded px-3 py-2 md:py-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                    value={inputs.propertyType}
                    onChange={(e) => handleInputChange('propertyType', e.target.value)}
                  >
                    {PROPERTY_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="p-3 md:p-4 bg-gray-50 rounded shadow">
                <h2 className="text-lg font-semibold mb-3 md:mb-4 text-gray-800">Mortgage Details</h2>
                
                <div className="mb-3 md:mb-4">
                  <label className="block text-xs md:text-sm font-medium mb-1 text-gray-700">Interest Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    className="w-full px-4 py-2 md:py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 text-black"
                    value={inputs.interestRate}
                    onChange={(e) => handleInputChange('interestRate', e.target.value)}
                    onBlur={() => handleBlur('interestRate')}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs md:text-sm font-medium mb-1 text-gray-700">Amortization</label>
                    <select
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                      value={inputs.amortizationPeriod}
                      onChange={(e) => handleInputChange('amortizationPeriod', Number(e.target.value))}
                    >
                      {AMORTIZATION_PERIODS.map(period => (
                        <option key={period.value} value={period.value}>{period.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs md:text-sm font-medium mb-1 text-gray-700">Term</label>
                    <select
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                      value={inputs.term}
                      onChange={(e) => handleInputChange('term', Number(e.target.value))}
                    >
                      {TERM_LENGTHS.map(term => (
                        <option key={term.value} value={term.value}>{term.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="mb-3 md:mb-4">
                  <label className="block text-xs md:text-sm font-medium mb-1 text-gray-700">Payment Frequency</label>
                  <select
                    className="w-full border border-gray-300 rounded px-3 py-2 md:py-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                    value={inputs.paymentFrequency}
                    onChange={(e) => handleInputChange('paymentFrequency', e.target.value)}
                  >
                    {PAYMENT_FREQUENCIES.map(frequency => (
                      <option key={frequency.value} value={frequency.value}>{frequency.label}</option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="firstTimeBuyer"
                      className="h-4 w-4 mr-2 text-blue-600 focus:ring-blue-500"
                      checked={inputs.firstTimeBuyer}
                      onChange={(e) => handleInputChange('firstTimeBuyer', e.target.checked)}
                    />
                    <label htmlFor="firstTimeBuyer" className="text-xs md:text-sm text-gray-700">First-time Buyer</label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="newlyBuiltHome"
                      className="h-4 w-4 mr-2 text-blue-600 focus:ring-blue-500"
                      checked={inputs.newlyBuiltHome}
                      onChange={(e) => handleInputChange('newlyBuiltHome', e.target.checked)}
                    />
                    <label htmlFor="newlyBuiltHome" className="text-xs md:text-sm text-gray-700">Newly Built Home</label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="foreignBuyer"
                      className="h-4 w-4 mr-2 text-blue-600 focus:ring-blue-500"
                      checked={inputs.foreignBuyer}
                      onChange={(e) => handleInputChange('foreignBuyer', e.target.checked)}
                    />
                    <label htmlFor="foreignBuyer" className="text-xs md:text-sm text-gray-700">Foreign Buyer</label>
                  </div>
                </div>
              </div>
            </>
          )}
          
          {activeTab === 'expenses' && (
            <div className="p-3 md:p-4 bg-gray-50 rounded shadow">
              <h2 className="text-lg font-semibold mb-3 md:mb-4 text-gray-800">Additional Expenses</h2>
              
              <div className="mb-3 md:mb-4">
                <label className="block text-xs md:text-sm font-medium mb-1 text-gray-700">Property Taxes (Annual)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    className="w-full pl-8 pr-4 py-2 md:py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 text-black"
                    value={inputs.propertyTaxes}
                    onChange={(e) => handleInputChange('propertyTaxes', e.target.value)}
                    onBlur={() => handleBlur('propertyTaxes')}
                  />
                </div>
              </div>
              
              <div className="mb-3 md:mb-4">
                <label className="block text-xs md:text-sm font-medium mb-1 text-gray-700">Condo Fees (Monthly)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    className="w-full pl-8 pr-4 py-2 md:py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 text-black"
                    value={inputs.condoFees}
                    onChange={(e) => handleInputChange('condoFees', e.target.value)}
                    onBlur={() => handleBlur('condoFees')}
                  />
                </div>
              </div>
              
              <div className="mb-3 md:mb-4">
                <label className="block text-xs md:text-sm font-medium mb-1 text-gray-700">Home Insurance (Annual)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    className="w-full pl-8 pr-4 py-2 md:py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 text-black"
                    value={inputs.homeInsurance}
                    onChange={(e) => handleInputChange('homeInsurance', e.target.value)}
                    onBlur={() => handleBlur('homeInsurance')}
                  />
                </div>
              </div>
              
              <div className="mb-3 md:mb-4">
                <label className="block text-xs md:text-sm font-medium mb-1 text-gray-700">Utilities (Monthly)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    className="w-full pl-8 pr-4 py-2 md:py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 text-black"
                    value={inputs.utilities}
                    onChange={(e) => handleInputChange('utilities', e.target.value)}
                    onBlur={() => handleBlur('utilities')}
                  />
                </div>
              </div>
              
              <div className="mb-3 md:mb-4">
                <label className="block text-xs md:text-sm font-medium mb-1 text-gray-700">Maintenance (% of home value annually)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">%</span>
                  <input
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    className="w-full pl-8 pr-4 py-2 md:py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 text-black"
                    value={inputs.maintenance}
                    onChange={(e) => handleInputChange('maintenance', e.target.value)}
                    onBlur={() => handleBlur('maintenance')}
                  />
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'prepayment' && (
            <div className="p-3 md:p-4 bg-gray-50 rounded shadow">
              <h2 className="text-lg font-semibold mb-3 md:mb-4 text-gray-800">Prepayment Options</h2>
              
              <div className="mb-3 md:mb-4">
                <label className="block text-xs md:text-sm font-medium mb-1 text-gray-700">Extra Payment Per Period</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    className="w-full pl-8 pr-4 py-2 md:py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 text-black"
                    value={inputs.extraPayment}
                    onChange={(e) => handleInputChange('extraPayment', e.target.value)}
                    onBlur={() => handleBlur('extraPayment')}
                  />
                </div>
              </div>
              
              <div className="mb-3 md:mb-4">
                <label className="block text-xs md:text-sm font-medium mb-1 text-gray-700">Payment Increase (%)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">%</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    className="w-full pl-8 pr-4 py-2 md:py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 text-black"
                    value={inputs.paymentIncrease}
                    onChange={(e) => handleInputChange('paymentIncrease', e.target.value)}
                    onBlur={() => handleBlur('paymentIncrease')}
                  />
                </div>
              </div>
              
              <div className="mb-3 md:mb-4">
                <label className="block text-xs md:text-sm font-medium mb-1 text-gray-700">Annual Lump Sum (% of original principal)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">%</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    className="w-full pl-8 pr-4 py-2 md:py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 text-black"
                    value={inputs.annualPrepayment}
                    onChange={(e) => handleInputChange('annualPrepayment', e.target.value)}
                    onBlur={() => handleBlur('annualPrepayment')}
                  />
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'closingCosts' && (
            <div className="p-3 md:p-4 bg-gray-50 rounded shadow">
              <h2 className="text-lg font-semibold mb-3 md:mb-4 text-gray-800">Closing Cost Details</h2>
              
              <div className="mb-3 md:mb-4">
                <label className="block text-xs md:text-sm font-medium mb-1 text-gray-700">Legal Fees</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    className="w-full pl-8 pr-4 py-2 md:py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 text-black"
                    value={inputs.legalFees}
                    onChange={(e) => handleInputChange('legalFees', e.target.value)}
                    onBlur={() => handleBlur('legalFees')}
                  />
                </div>
              </div>
              
              <div className="mb-3 md:mb-4">
                <label className="block text-xs md:text-sm font-medium mb-1 text-gray-700">Title Insurance</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    className="w-full pl-8 pr-4 py-2 md:py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 text-black"
                    value={inputs.titleInsurance}
                    onChange={(e) => handleInputChange('titleInsurance', e.target.value)}
                    onBlur={() => handleBlur('titleInsurance')}
                  />
                </div>
              </div>
              
              <div className="mb-3 md:mb-4">
                <label className="block text-xs md:text-sm font-medium mb-1 text-gray-700">Home Inspection</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    className="w-full pl-8 pr-4 py-2 md:py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 text-black"
                    value={inputs.homeInspection}
                    onChange={(e) => handleInputChange('homeInspection', e.target.value)}
                    onBlur={() => handleBlur('homeInspection')}
                  />
                </div>
              </div>
              
              <div className="mb-3 md:mb-4">
                <label className="block text-xs md:text-sm font-medium mb-1 text-gray-700">Appraisal Fee</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    className="w-full pl-8 pr-4 py-2 md:py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 text-black"
                    value={inputs.appraisalFee}
                    onChange={(e) => handleInputChange('appraisalFee', e.target.value)}
                    onBlur={() => handleBlur('appraisalFee')}
                  />
                </div>
              </div>
              
              <div className="mb-3 md:mb-4">
                <label className="block text-xs md:text-sm font-medium mb-1 text-gray-700">Moving Costs</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    className="w-full pl-8 pr-4 py-2 md:py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 text-black"
                    value={inputs.movingCosts}
                    onChange={(e) => handleInputChange('movingCosts', e.target.value)}
                    onBlur={() => handleBlur('movingCosts')}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="lg:col-span-2">
          {activeTab === 'summary' && (
            <>
              <div className="bg-blue-50 p-3 md:p-4 rounded-lg shadow mb-4 md:mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-blue-800 mb-4">Key Details</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-700">Purchase Price:</span>
                        <span className="font-semibold text-gray-900">{formatCurrency(inputs.purchasePrice)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Down Payment:</span>
                        <span className="font-semibold text-gray-900">
                          {inputs.downPaymentType === 'amount'
                            ? formatCurrency(inputs.downPayment)
                            : formatCurrency(inputs.purchasePrice * inputs.downPayment / 100)
                          } ({results.downPaymentPercent.toFixed(2)}%)
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Mortgage Amount:</span>
                        <span className="font-semibold text-gray-900">{formatCurrency(results.mortgageAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Mortgage Insurance:</span>
                        <span className="font-semibold text-gray-900">{formatCurrency(results.mortgageInsurance)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Total Mortgage:</span>
                        <span className="font-semibold text-gray-900">{formatCurrency(results.totalMortgage)}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-blue-800 mb-4">Payment Details</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-700">Payment:</span>
                        <span className="font-semibold text-gray-900">{formatCurrency(results.monthlyPayment)} monthly</span>
                      </div>
                      {/* <div className="flex justify-between">
                        <span className="text-gray-700">First Payment Principal:</span>
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(results.firstPrincipalPerPayment)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">First Payment Interest:</span>
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(results.firstInterestPerPayment)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        * Principal and interest amounts shown are for the first payment only. 
                        These values will change over time as your balance decreases.
                      </p> */}
                      <div className="flex justify-between">
                        <span className="text-gray-700">Principal:</span>
                        <span className="font-semibold text-gray-900">{formatCurrency(results.principalPerPayment)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Interest:</span>
                        <span className="font-semibold text-gray-900">{formatCurrency(results.interestPerPayment)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Total Monthly Cost:</span>
                        <span className="font-semibold text-gray-900">{formatCurrency(results.totalMonthlyExpenses)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-blue-800 mb-4">Term Summary</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-700">Interest Rate:</span>
                        <span className="font-semibold text-gray-900">{formatPercent(inputs.interestRate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Term Length:</span>
                        <span className="font-semibold text-gray-900">{inputs.term} years</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Interest Over Term:</span>
                        <span className="font-semibold text-gray-900">{formatCurrency(results.interestPaidOverTerm)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Balance at End of Term:</span>
                        <span className="font-semibold text-gray-900">{formatCurrency(results.balanceAtEndOfTerm)}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-blue-800 mb-4">Amortization</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-700">Amortization Period:</span>
                        <span className="font-semibold text-gray-900">{inputs.amortizationPeriod} years</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Effective Amortization:</span>
                        <span className="font-semibold text-gray-900">{results.effectiveAmortization.toFixed(2)} years</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Closing Costs:</span>
                        <span className="font-semibold text-gray-900">{formatCurrency(results.closingCosts)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white border rounded p-3 md:p-4 shadow mb-6">
                <h3 className="text-lg font-semibold mb-3 md:mb-4 text-gray-800">Payment Breakdown</h3>
                <div className="h-48 md:h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={preparePaymentBreakdownData()}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="principalPaid"
                        name="Principal Paid"
                        stroke="#3b82f6"
                        activeDot={{ r: 8 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="interestPaid"
                        name="Interest Paid"
                        stroke="#ef4444"
                        activeDot={{ r: 8 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className="bg-white border rounded p-3 md:p-4 shadow">
                <h3 className="text-lg font-semibold mb-3 md:mb-4 text-gray-800">Calculation Summary</h3>
                <div className="space-y-2 text-sm text-gray-700">
                  <p>Mortgage Amount: {formatCurrency(results.mortgageAmount)}</p>
                  <p>Interest Rate: {formatPercent(inputs.interestRate)}</p>
                  <p>Amortization: {inputs.amortizationPeriod} years</p>
                  <p>Payment Frequency: {PAYMENT_FREQUENCIES.find(f => f.value === inputs.paymentFrequency)?.label}</p>
                  <p>Total Cost Over Amortization: {formatCurrency(results.totalMortgage + results.interestPaidOverTerm)}</p>
                </div>
              </div>
            </>
          )}

          {activeTab === 'expenses' && (
            <div className="bg-white border rounded p-3 md:p-4 shadow">
              <h3 className="text-lg font-semibold mb-3 md:mb-4 text-gray-800">Monthly Expenses Breakdown</h3>
              
              <div className="space-y-4">
                <div className="p-3 md:p-4 bg-blue-50 rounded">
                  <div className="flex justify-between mb-2">
                    <span className="font-semibold text-gray-800">Mortgage Payment</span>
                    <span className="font-semibold text-gray-800">{formatCurrency(results.monthlyPayment)}</span>
                  </div>
                  <div className="pl-4 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-700">Principal:</span>
                      <span className="text-gray-700">{formatCurrency(results.principalPerPayment)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">Interest:</span>
                      <span className="text-gray-700">{formatCurrency(results.interestPerPayment)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-3 md:p-4 bg-gray-50 rounded">
                  <div className="flex justify-between mb-2">
                    <span className="font-semibold text-gray-800">Property Expenses</span>
                    <span className="font-semibold text-gray-800">{formatCurrency(inputs.propertyTaxes / 12 + inputs.condoFees)}</span>
                  </div>
                  <div className="pl-4 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-700">Property Taxes:</span>
                      <span className="text-gray-700">{formatCurrency(inputs.propertyTaxes / 12)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">Condo Fees:</span>
                      <span className="text-gray-700">{formatCurrency(inputs.condoFees)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-3 md:p-4 bg-gray-50 rounded">
                  <div className="flex justify-between mb-2">
                    <span className="font-semibold text-gray-800">Other Expenses</span>
                    <span className="font-semibold text-gray-800">{formatCurrency(
                      (inputs.homeInsurance / 12) + 
                      inputs.utilities + 
                      ((inputs.purchasePrice * (inputs.maintenance / 100)) / 12)
                    )}</span>
                  </div>
                  <div className="pl-4 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-700">Home Insurance:</span>
                      <span className="text-gray-700">{formatCurrency(inputs.homeInsurance / 12)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">Utilities:</span>
                      <span className="text-gray-700">{formatCurrency(inputs.utilities)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">Maintenance:</span>
                      <span className="text-gray-700">{formatCurrency((inputs.purchasePrice * inputs.maintenance / 100) / 12)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-3 md:p-4 bg-blue-100 rounded">
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-800">Total Monthly Cost</span>
                    <span className="font-semibold text-gray-800">{formatCurrency(results.totalMonthlyExpenses)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'prepayment' && (
            <div className="bg-white border rounded p-3 md:p-4 shadow">
              <h3 className="text-lg font-semibold mb-3 md:mb-4 text-gray-800">Prepayment Impact</h3>
              
              <div className="mb-6">
                <h4 className="font-medium mb-2 text-gray-800">Current Prepayment Options</h4>
                <div className="p-3 md:p-4 bg-gray-50 rounded space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Extra Payment Per Period:</span>
                    <span className="text-gray-700">{formatCurrency(inputs.extraPayment)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Payment Increase:</span>
                    <span className="text-gray-700">{inputs.paymentIncrease}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Annual Lump Sum:</span>
                    <span className="text-gray-700">{inputs.annualPrepayment}% of principal</span>
                  </div>
                </div>
              </div>
              
              <div className="mb-6">
                <h4 className="font-medium mb-2 text-gray-800">Amortization Impact</h4>
                <div className="p-3 md:p-4 bg-blue-50 rounded space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Original Amortization:</span>
                    <span className="text-gray-700">{inputs.amortizationPeriod} years</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Effective Amortization:</span>
                    <span className="text-gray-700">{results.effectiveAmortization.toFixed(2)} years</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Time Saved:</span>
                    <span className="font-medium text-green-600">{results.timeShaved.toFixed(2)} years</span>
                  </div>
                </div>
              </div>
              
              <div className="mb-6">
                <h4 className="font-medium mb-2 text-gray-800">Interest Savings</h4>
                <div className="p-3 md:p-4 bg-green-50 rounded space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Interest Savings Over Term:</span>
                    <span className="font-medium text-green-600">{formatCurrency(results.interestSavingsOverTerm)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Interest Savings Over Amortization:</span>
                    <span className="font-medium text-green-600">{formatCurrency(results.interestSavingsOverAmortization)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'amortization' && (
            <div>
              <div className="bg-white border rounded p-3 md:p-4 shadow mb-6">
                <h3 className="text-lg font-semibold mb-3 md:mb-4 text-gray-800">Amortization Schedule</h3>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                        <th className="px-2 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Starting Balance</th>
                        <th className="px-2 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Principal Paid</th>
                        <th className="px-2 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interest Paid</th>
                        <th className="px-2 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ending Balance</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {results.amortizationSchedule.map((year) => (
                        <tr key={year.year}>
                          <td className="px-2 md:px-6 py-2 md:py-4 whitespace-nowrap text-xs md:text-sm font-medium text-gray-900">{year.year}</td>
                          <td className="px-2 md:px-6 py-2 md:py-4 whitespace-nowrap text-xs md:text-sm text-gray-700">{formatCurrency(year.startingBalance)}</td>
                          <td className="px-2 md:px-6 py-2 md:py-4 whitespace-nowrap text-xs md:text-sm text-gray-700">{formatCurrency(year.principalPaid)}</td>
                          <td className="px-2 md:px-6 py-2 md:py-4 whitespace-nowrap text-xs md:text-sm text-gray-700">{formatCurrency(year.interestPaid)}</td>
                          <td className="px-2 md:px-6 py-2 md:py-4 whitespace-nowrap text-xs md:text-sm text-gray-700">{formatCurrency(year.endingBalance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="bg-white border rounded p-3 md:p-4 shadow">
                <h3 className="text-lg font-semibold mb-3 md:mb-4 text-gray-800">Balance Projection</h3>
                
                <div className="h-48 md:h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={results.amortizationSchedule}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="endingBalance"
                        name="Remaining Balance"
                        stroke="#3b82f6"
                        activeDot={{ r: 8 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-4 md:mt-8 text-center p-3 bg-gray-50 rounded-lg">
        <p className="text-xs md:text-sm text-gray-700">
          This calculator provides estimates only and should not be considered financial advice. 
          Consult with a mortgage professional for accurate information specific to your situation.
        </p>
        <button 
          onClick={() => window.print()}
          className="mt-3 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg inline-flex items-center text-sm font-medium shadow-sm transition"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path>
          </svg>
          Print / Export PDF
        </button>
      </div>
    </div>
  );
};

export default MortgageCalculator;
'use client'

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Responsive utility hook
function useWindowSize() {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }
    
    window.addEventListener("resize", handleResize);
    handleResize(); // Call once on mount
    
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  
  return windowSize;
}

// Constants remain the same
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

const MUNICIPALITIES: Record<string, { value: string; label: string }[]> = {
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

const PAYMENT_FREQUENCIES = [
  { value: 'monthly', label: 'Monthly', paymentsPerYear: 12 },
  { value: 'biweekly', label: 'Bi-Weekly', paymentsPerYear: 26 },
  { value: 'accelerated_biweekly', label: 'Accelerated Bi-Weekly', paymentsPerYear: 26 },
  { value: 'weekly', label: 'Weekly', paymentsPerYear: 52 },
  { value: 'accelerated_weekly', label: 'Accelerated Weekly', paymentsPerYear: 52 }
];

const AMORTIZATION_PERIODS = Array.from({ length: 26 }, (_, i) => i + 5)
  .filter(year => year <= 30)
  .map(year => ({ value: year, label: `${year} Years` }));

const TERM_LENGTHS = Array.from({ length: 10 }, (_, i) => i + 1)
  .map(year => ({ value: year, label: `${year} Year${year > 1 ? 's' : ''}` }));

// Utility functions
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(value);
};

const formatPercent = (value: number) => {
  return new Intl.NumberFormat('en-CA', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value / 100);
};

// Calculate foreign buyer taxes based on province and property value
const calculateForeignBuyerTax = (propertyValue: number, province: string, municipality: string, isForeignBuyer: boolean) => {
  if (!isForeignBuyer) return 0;
  
  let taxRate = 0;
  
  switch (province) {
    case 'BC':
      // BC: 20% foreign buyers tax in certain regions
      const bcTaxableRegions = ['none']; // For simplicity, apply to all of BC
      if (bcTaxableRegions.includes(municipality)) {
        taxRate = 0.20; // 20%
      }
      break;
    
    case 'ON':
      // Ontario: 25% non-resident speculation tax (NRST)
      const onTaxableRegions = ['none', 'toronto']; // GGH region
      if (onTaxableRegions.includes(municipality)) {
        taxRate = 0.25; // 25%
      }
      break;
    
    case 'QC':
      // Quebec: 3.33% in Montreal region
      if (municipality === 'montreal') {
        taxRate = 0.0333; // 3.33%
      }
      break;
    
    default:
      taxRate = 0;
  }
  
  return propertyValue * taxRate;
};

// Types
interface Inputs {
  purchasePrice: number | '';
  downPayment: number | '';
  downPaymentType: 'amount' | 'percent';
  province: string;
  municipality: string;
  propertyType: string;
  interestRate: number | '';
  amortizationPeriod: number;
  term: number;
  paymentFrequency: string;
  firstTimeBuyer: boolean;
  newlyBuiltHome: boolean;
  foreignBuyer: boolean;
  propertyTaxes: number | '';
  condoFees: number | '';
  homeInsurance: number | '';
  utilities: number | '';
  maintenance: number | '';
  extraPayment: number | '';
  paymentIncrease: number | '';
  annualPrepayment: number | '';
  legalFees: number | '';
  titleInsurance: number | '';
  homeInspection: number | '';
  appraisalFee: number | '';
  brokerageFee: number | '';
  lenderFee: number | '';
  movingCosts: number | '';
}

interface YearlyScheduleItem {
  year: number;
  startingBalance: number;
  principalPaid: number;
  interestPaid: number;
  extraPayments: number;
  endingBalance: number;
}

interface Results {
  mortgageAmount: number;
  downPaymentPercent: number;
  mortgageInsurance: number;
  totalMortgage: number;
  monthlyPayment: number;
  principalPerPayment: number;
  interestPerPayment: number;
  totalMonthlyExpenses: number;
  interestPaidOverTerm: number;
  balanceAtEndOfTerm: number;
  amortizationSchedule: YearlyScheduleItem[];
  standardAmortizationSchedule: YearlyScheduleItem[];
  effectiveAmortization: number;
  closingCosts: number;
  interestSavingsOverTerm: number;
  interestSavingsOverAmortization: number;
  timeShaved: number;
}

interface LandTransferTaxDetails {
  provincial: { value: number; name: string };
  municipal: { value: number; name: string };
}

interface LandTransferTaxResult {
  total: number;
  details: LandTransferTaxDetails;
}

interface ScheduleResult {
  yearlySchedule: YearlyScheduleItem[];
  totalInterestPaid: number;
  totalInterestPaidOverTerm: number;
  balanceAtEndOfTerm: number;
  effectiveAmortizationYears: number;
}

interface DataPoint {
  year: number;
  standardBalance: number;
  acceleratedBalance?: number;  // Optional since it's not always present
}

// Main component
const ResponsiveMortgageCalculator = () => {
  const { width } = useWindowSize();
  const isMobile = width < 768; // Common breakpoint for tablets and below
  
  // State for inputs
  const [inputs, setInputs] = useState<Inputs>({
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
    utilities: 300,
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
  
  // State for results
  const [results, setResults] = useState<Results>({
    mortgageAmount: 0,
    downPaymentPercent: 0,
    mortgageInsurance: 0,
    totalMortgage: 0,
    monthlyPayment: 0,
    principalPerPayment: 0,
    interestPerPayment: 0,
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

  // UI state
  const [activeTab, setActiveTab] = useState('summary');
  const [expandedSection, setExpandedSection] = useState(isMobile ? 'property' : '');
  
  // Handle input changes
  const handleInputChange = (name: keyof Inputs, value: unknown) => {
    // Handle empty string
    if (value === '') {
      setInputs(prev => ({ ...prev, [name]: '' }));
      return;
    }
    
    // Handle invalid numbers
    if (typeof value === 'string' && isNaN(Number(value))) {
      setInputs(prev => ({ ...prev, [name]: '' }));
      return;
    }
    
    // For numeric fields
    if (typeof inputs[name] === 'number') {
      // Convert to number and prevent leading zeros
      const numericValue = typeof value === 'string' ? value.replace(/^0+(?=\d)/, '') : String(value);
      value = Number(numericValue);
    }
    
    const updatedInputs = { ...inputs, [name]: value };
  
    // Update related values
    if (name === 'purchasePrice' && inputs.downPaymentType === 'percent') {
      const purchasePrice = typeof value === 'number' ? value : 0;
      const downPaymentPercent = typeof inputs.downPayment === 'number' ? inputs.downPayment : 0;
      updatedInputs.downPayment = Math.round(purchasePrice * (downPaymentPercent / 100) / 100) * 100;
    } else if (name === 'downPayment') {
      if (inputs.downPaymentType === 'percent') {
        const numValue = Number(value);
        if (numValue > 100) value = 100;
        updatedInputs.downPayment = Number(value);
      } else {
        const purchasePrice = typeof inputs.purchasePrice === 'number' ? inputs.purchasePrice : 0;
        const numValue = Number(value);
        if (numValue > purchasePrice) value = purchasePrice;
        updatedInputs.downPayment = Number(value);
      }
    } else if (name === 'downPaymentType') {
      const purchasePrice = typeof inputs.purchasePrice === 'number' ? inputs.purchasePrice : 0;
      const downPayment = typeof inputs.downPayment === 'number' ? inputs.downPayment : 0;
      
      if (value === 'percent') {
        updatedInputs.downPayment = Math.round((downPayment / purchasePrice) * 100);
      } else {
        updatedInputs.downPayment = Math.round(purchasePrice * (downPayment / 100) / 100) * 100;
      }
    }
  
    setInputs(updatedInputs);
  };

  // Handle blur event
  const handleBlur = (name: keyof Inputs) => {
    if (inputs[name] === '') {
      setInputs(prev => ({ ...prev, [name]: 0 }));
    }
  };

  // Calculate mortgage details
  useEffect(() => {
    if (Object.values(inputs).some(value => value === '')) {
      return;
    }
    
    calculateMortgage();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputs]);

  // Function to generate amortization schedule
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
  ): ScheduleResult => {
    const interestRatePerPayment = (annualInterestRate / 100) / paymentsPerYear;
    let balance = principal;
    let totalInterestPaid = 0;
    const yearlySchedule: YearlyScheduleItem[] = [];
    let totalInterestPaidOverTerm = 0;
    let balanceAtEndOfTerm = 0;
    let lastPaymentNumber = 0;
    
    // Calculate adjusted payment with increase
    const adjustedPayment = paymentAmount * (1 + paymentIncrease / 100);
    
    // Process each year
    for (let year = 1; year <= amortizationYears; year++) {
      let yearlyPrincipalPaid = 0;
      let yearlyInterestPaid = 0;
      let yearlyExtraPayments = 0;
      
      // Process each payment in the year
      for (let i = 1; i <= paymentsPerYear; i++) {
        lastPaymentNumber++;
        if (balance <= 0) break;
        
        // Calculate interest and principal for this payment
        const interestForPayment = balance * interestRatePerPayment;
        let principalForPayment = Math.min(adjustedPayment - interestForPayment, balance);
        
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
      
      // Add year to schedule
      yearlySchedule.push({
        year,
        startingBalance: principal - yearlyPrincipalPaid + yearlyInterestPaid + balance,
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

  // Calculate land transfer tax
  const calculateLandTransferTax = (propertyValue: number, province: string, municipality: string, firstTimeBuyer: boolean): LandTransferTaxResult => {
    let provincialTax = 0;
    let municipalTax = 0;
    const taxDetails: LandTransferTaxDetails = {
      provincial: { value: 0, name: "" },
      municipal: { value: 0, name: "" }
    };

    // Calculate provincial tax
    switch (province) {
      case 'ON':
        taxDetails.provincial.name = "Ontario Land Transfer Tax";
        if (propertyValue <= 55000) {
          provincialTax = propertyValue * 0.005;
        } else if (propertyValue <= 250000) {
          provincialTax = 275 + (propertyValue - 55000) * 0.01;
        } else if (propertyValue <= 400000) {
          provincialTax = 2225 + (propertyValue - 250000) * 0.015;
        } else if (propertyValue <= 2000000) {
          provincialTax = 4475 + (propertyValue - 400000) * 0.02;
        } else {
          provincialTax = 36475 + (propertyValue - 2000000) * 0.025;
        }
        
        if (firstTimeBuyer) {
          const rebate = Math.min(4000, provincialTax);
          provincialTax = Math.max(0, provincialTax - rebate);
        }
        break;
      
      case 'BC':
        taxDetails.provincial.name = "BC Property Transfer Tax";
        if (propertyValue <= 200000) {
          provincialTax = propertyValue * 0.01;
        } else if (propertyValue <= 2000000) {
          provincialTax = 2000 + (propertyValue - 200000) * 0.02;
        } else if (propertyValue <= 3000000) {
          provincialTax = 38000 + (propertyValue - 2000000) * 0.03;
        } else {
          provincialTax = 68000 + (propertyValue - 3000000) * 0.05;
        }
        
        if (firstTimeBuyer && propertyValue <= 500000) {
          provincialTax = 0;
        } else if (firstTimeBuyer && propertyValue <= 525000) {
          const rebate = (525000 - propertyValue) / 25000 * provincialTax;
          provincialTax -= rebate;
        }
        break;
      
      case 'QC':
        taxDetails.provincial.name = "Quebec Land Transfer Tax";
        if (propertyValue <= 50000) {
          provincialTax = propertyValue * 0.005;
        } else if (propertyValue <= 250000) {
          provincialTax = 250 + (propertyValue - 50000) * 0.01;
        } else {
          provincialTax = 2250 + (propertyValue - 250000) * 0.015;
        }
        break;
        
      case 'AB':
        taxDetails.provincial.name = "Alberta Transfer Fee";
        provincialTax = 0;
        break;
      
      case 'NS':
        taxDetails.provincial.name = "Nova Scotia Deed Transfer Tax";
        provincialTax = propertyValue * 0.015;
        break;
      
      default:
        taxDetails.provincial.name = "Provincial Transfer Tax";
        provincialTax = propertyValue * 0.015;
    }
    
    taxDetails.provincial.value = provincialTax;
    
    // Calculate municipal tax
    if (province === 'ON' && municipality === 'toronto') {
      taxDetails.municipal.name = "Toronto Municipal Land Transfer Tax";
      if (propertyValue <= 55000) {
        municipalTax = propertyValue * 0.005;
      } else if (propertyValue <= 250000) {
        municipalTax = 275 + (propertyValue - 55000) * 0.01;
      } else if (propertyValue <= 400000) {
        municipalTax = 2225 + (propertyValue - 250000) * 0.015;
      } else if (propertyValue <= 2000000) {
        municipalTax = 4475 + (propertyValue - 400000) * 0.02;
      } else {
        municipalTax = 36475 + (propertyValue - 2000000) * 0.025;
      }
      
      if (firstTimeBuyer) {
        const rebate = Math.min(4475, municipalTax);
        municipalTax = Math.max(0, municipalTax - rebate);
      }
    } else if (province === 'QC' && municipality === 'montreal') {
      taxDetails.municipal.name = "Montreal Transfer Duties";
      if (propertyValue <= 50000) {
        municipalTax = propertyValue * 0.005;
      } else if (propertyValue <= 250000) {
        municipalTax = 250 + (propertyValue - 50000) * 0.01;
      } else if (propertyValue <= 500000) {
        municipalTax = 2250 + (propertyValue - 250000) * 0.015;
      } else if (propertyValue <= 1000000) {
        municipalTax = 6000 + (propertyValue - 500000) * 0.02;
      } else {
        municipalTax = 16000 + (propertyValue - 1000000) * 0.025;
      }
    } else if (province === 'NS' && municipality === 'halifax') {
      taxDetails.municipal.name = "Halifax Deed Transfer Tax";
      municipalTax = propertyValue * 0.015; // 1.5% rate
    }
    
    taxDetails.municipal.value = municipalTax;
    
    return {
      total: provincialTax + municipalTax,
      details: taxDetails
    };
  };

  // Main calculation function
  const calculateMortgage = () => {
    // Calculate down payment amount and percentage
    let downPaymentAmount: number, downPaymentPercent: number;
    const purchasePrice = typeof inputs.purchasePrice === 'number' ? inputs.purchasePrice : 0;

    if (inputs.downPaymentType === 'amount') {
      downPaymentAmount = typeof inputs.downPayment === 'number' ? inputs.downPayment : 0;
      downPaymentPercent = (downPaymentAmount / purchasePrice) * 100;
    } else {
      downPaymentPercent = typeof inputs.downPayment === 'number' ? inputs.downPayment : 0;
      downPaymentAmount = (purchasePrice * downPaymentPercent) / 100;
    }

    // Ensure down payment meets minimum requirements
    const minimumDownPaymentPercent = inputs.foreignBuyer ? 35 : 
      (purchasePrice <= 500000 ? 5 :
       purchasePrice <= 1000000 ? ((purchasePrice - 500000) * 0.1 + 25000) / purchasePrice * 100 : 20);
    
    const minimumDownPayment = (minimumDownPaymentPercent / 100) * purchasePrice;

    const actualDownPayment = Math.max(downPaymentAmount, minimumDownPayment);
    const actualDownPaymentPercent = (actualDownPayment / purchasePrice) * 100;
    
    // Calculate mortgage insurance (if down payment < 20%)
    let mortgageInsurance = 0;
    if (actualDownPaymentPercent < 20) {
      const loanToValue = 100 - actualDownPaymentPercent;
      
      // CMHC insurance rates (simplified)
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

    // Calculate total mortgage amount
    const mortgageAmount = purchasePrice - actualDownPayment;
    const totalMortgage = mortgageAmount + mortgageInsurance;

    // Calculate payment amount
    const interestRate = typeof inputs.interestRate === 'number' ? inputs.interestRate : 0;
    const annualInterestRate = interestRate / 100;
    const paymentFrequencyObj = PAYMENT_FREQUENCIES.find(f => f.value === inputs.paymentFrequency);
    const paymentsPerYear = paymentFrequencyObj?.paymentsPerYear || 12;
    const totalPayments = inputs.amortizationPeriod * paymentsPerYear;
    const interestRatePerPayment = annualInterestRate / paymentsPerYear;

    let paymentAmount;
    if (interestRate === 0) {
      paymentAmount = totalMortgage / totalPayments;
    } else {
      paymentAmount = totalMortgage * 
        (interestRatePerPayment * Math.pow(1 + interestRatePerPayment, totalPayments)) / 
        (Math.pow(1 + interestRatePerPayment, totalPayments) - 1);
    }

    // If accelerated, adjust payment amount
    if (inputs.paymentFrequency === 'accelerated_biweekly') {
      const monthlyEquivalent = totalMortgage * 
        (annualInterestRate/12 * Math.pow(1 + annualInterestRate/12, inputs.amortizationPeriod * 12)) / 
        (Math.pow(1 + annualInterestRate/12, inputs.amortizationPeriod * 12) - 1);
      paymentAmount = monthlyEquivalent / 2;
    } else if (inputs.paymentFrequency === 'accelerated_weekly') {
      const monthlyEquivalent = totalMortgage * 
        (annualInterestRate/12 * Math.pow(1 + annualInterestRate/12, inputs.amortizationPeriod * 12)) / 
        (Math.pow(1 + annualInterestRate/12, inputs.amortizationPeriod * 12) - 1);
      paymentAmount = monthlyEquivalent / 4;
    }

    // Calculate monthly equivalent payment for expense summaries
    const monthlyPayment = inputs.paymentFrequency === 'monthly' 
      ? paymentAmount 
      : paymentAmount * paymentsPerYear / 12;

    // Prepare values for prepayment
    const extraPayment = typeof inputs.extraPayment === 'number' ? inputs.extraPayment : 0;
    const paymentIncrease = typeof inputs.paymentIncrease === 'number' ? inputs.paymentIncrease : 0;
    const annualPrepayment = typeof inputs.annualPrepayment === 'number' ? inputs.annualPrepayment : 0;
    
    // Generate standard schedule (without prepayments)
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
    
    // Now generate schedule with prepayments
    const schedule = generateAmortizationSchedule(
      totalMortgage, 
      interestRate, 
      inputs.amortizationPeriod, 
      paymentAmount, 
      paymentsPerYear, 
      inputs.term,
      extraPayment,
      paymentIncrease,
      annualPrepayment
    );

    // Calculate total expenses
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

    // Calculate foreign buyer tax
    const foreignBuyerTax = calculateForeignBuyerTax(
      purchasePrice, 
      inputs.province, 
      inputs.municipality, 
      inputs.foreignBuyer
    );

    // Calculate closing costs
    const landTransferTaxResult = calculateLandTransferTax(
      purchasePrice, 
      inputs.province, 
      inputs.municipality, 
      inputs.firstTimeBuyer
    );
    
    const landTransferTax = landTransferTaxResult.total;
    
    const legalFees = typeof inputs.legalFees === 'number' ? inputs.legalFees : 0;
    const titleInsurance = typeof inputs.titleInsurance === 'number' ? inputs.titleInsurance : 0;
    const homeInspection = typeof inputs.homeInspection === 'number' ? inputs.homeInspection : 0;
    const pstOnInsurance = (inputs.province === 'ON' || inputs.province === 'QC') ? mortgageInsurance * 0.08 : 0;
    const appraisalFee = typeof inputs.appraisalFee === 'number' ? inputs.appraisalFee : 0;
    const brokerageFee = typeof inputs.brokerageFee === 'number' ? inputs.brokerageFee : 0;
    const lenderFee = typeof inputs.lenderFee === 'number' ? inputs.lenderFee : 0;
    const movingCosts = typeof inputs.movingCosts === 'number' ? inputs.movingCosts : 0;
    
    const closingCosts = landTransferTax + foreignBuyerTax + legalFees + titleInsurance + homeInspection + 
                         pstOnInsurance + appraisalFee + brokerageFee + lenderFee + movingCosts;

    // Calculate principal and interest for the first payment
    const interestPerPayment = totalMortgage * interestRatePerPayment;
    const principalPerPayment = paymentAmount - interestPerPayment;

    // Calculate interest paid over term and balance at end of term
    const interestPaidOverTerm = schedule.totalInterestPaidOverTerm;
    const balanceAtEndOfTerm = schedule.balanceAtEndOfTerm;
    const effectiveAmortization = schedule.effectiveAmortizationYears;
    
    // Calculate interest savings
    const standardInterestPaidOverTerm = standardSchedule.totalInterestPaidOverTerm;
    const interestSavingsOverTerm = standardInterestPaidOverTerm - interestPaidOverTerm;
    const interestSavingsOverAmortization = originalInterestPaid - schedule.totalInterestPaid;
    const timeShaved = originalAmortization - effectiveAmortization;

    // Update results
    setResults({
      mortgageAmount,
      downPaymentPercent: actualDownPaymentPercent,
      mortgageInsurance,
      totalMortgage,
      monthlyPayment,
      principalPerPayment,
      interestPerPayment,
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
  };
  
  // Function to prepare data for comparison chart
  const prepareComparisonData = () => {
    if (!results.amortizationSchedule || !results.standardAmortizationSchedule) {
      return [];
    }
    
    // Determine the max number of years in either schedule
    const maxYears = Math.max(
      results.amortizationSchedule.length,
      results.standardAmortizationSchedule.length
    );
    
    // Create comparison data points
    const data = [];
    for (let i = 0; i < maxYears; i++) {
      const dataPoint: DataPoint = {
        year: i + 1,
        standardBalance: 0
      };
      
      // Add standard schedule balance if available
      if (i < results.standardAmortizationSchedule.length) {
        dataPoint.standardBalance = results.standardAmortizationSchedule[i].endingBalance;
      }
      
      // Add accelerated schedule balance if available
      if (i < results.amortizationSchedule.length) {
        dataPoint.acceleratedBalance = results.amortizationSchedule[i].endingBalance;
      }
      
      data.push(dataPoint);
    }
    
    return data;
  };

  // Toggle accordion sections
  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? '' : section);
  };

  // Function to generate a printable PDF
  const generatePDF = () => {
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      alert('Please allow popups to export the PDF');
      return;
    }
    
    // Create HTML content for the PDF
    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Mortgage Calculation Summary</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; padding: 20px; }
          h1 { color: #2563eb; text-align: center; margin-bottom: 30px; }
          h2 { color: #1d4ed8; margin-top: 30px; margin-bottom: 15px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
          .section { margin-bottom: 25px; background-color: #f9fafb; padding: 15px; border-radius: 5px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          .item { display: flex; justify-content: space-between; margin-bottom: 8px; }
          .label { font-weight: normal; }
          .value { font-weight: bold; }
          .total { font-weight: bold; margin-top: 10px; padding-top: 10px; border-top: 1px solid #ddd; }
          .highlight { background-color: #e6f0fa; padding: 15px; border-radius: 5px; margin-top: 20px; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <h1>Mortgage Calculation Summary</h1>
        
        <div class="section">
          <h2>Property Information</h2>
          <div class="grid">
            <div>
              <div class="item">
                <span class="label">Purchase Price:</span>
                <span class="value">${formatCurrency(typeof inputs.purchasePrice === 'number' ? inputs.purchasePrice : 0)}</span>
              </div>
              <div class="item">
                <span class="label">Down Payment:</span>
                <span class="value">${
                  inputs.downPaymentType === 'amount' 
                    ? formatCurrency(typeof inputs.downPayment === 'number' ? inputs.downPayment : 0) 
                    : formatCurrency((typeof inputs.purchasePrice === 'number' ? inputs.purchasePrice : 0) * (typeof inputs.downPayment === 'number' ? inputs.downPayment : 0) / 100)
                } (${results.downPaymentPercent.toFixed(2)}%)</span>
              </div>
              <div class="item">
                <span class="label">Location:</span>
                <span class="value">${PROVINCES.find(p => p.value === inputs.province)?.label || inputs.province}</span>
              </div>
              <div class="item">
                <span class="label">Municipality:</span>
                <span class="value">${MUNICIPALITIES[inputs.province]?.find(m => m.value === inputs.municipality)?.label || inputs.municipality}</span>
              </div>
            </div>
            <div>
              <div class="item">
                <span class="label">Property Type:</span>
                <span class="value">${PROPERTY_TYPES.find(t => t.value === inputs.propertyType)?.label || inputs.propertyType}</span>
              </div>
              <div class="item">
                <span class="label">First-Time Buyer:</span>
                <span class="value">${inputs.firstTimeBuyer ? 'Yes' : 'No'}</span>
              </div>
              <div class="item">
                <span class="label">Newly Built Home:</span>
                <span class="value">${inputs.newlyBuiltHome ? 'Yes' : 'No'}</span>
              </div>
              <div class="item">
                <span class="label">Foreign Buyer:</span>
                <span class="value">${inputs.foreignBuyer ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="section">
          <h2>Mortgage Details</h2>
          <div class="grid">
            <div>
              <div class="item">
                <span class="label">Mortgage Amount:</span>
                <span class="value">${formatCurrency(results.mortgageAmount)}</span>
              </div>
              <div class="item">
                <span class="label">Mortgage Insurance:</span>
                <span class="value">${formatCurrency(results.mortgageInsurance)}</span>
              </div>
              <div class="item">
                <span class="label">Total Mortgage:</span>
                <span class="value">${formatCurrency(results.totalMortgage)}</span>
              </div>
              <div class="item">
                <span class="label">Interest Rate:</span>
                <span class="value">${formatPercent(typeof inputs.interestRate === 'number' ? inputs.interestRate : 0)}</span>
              </div>
            </div>
            <div>
              <div class="item">
                <span class="label">Amortization Period:</span>
                <span class="value">${inputs.amortizationPeriod} years</span>
              </div>
              <div class="item">
                <span class="label">Term:</span>
                <span class="value">${inputs.term} years</span>
              </div>
              <div class="item">
                <span class="label">Payment Frequency:</span>
                <span class="value">${PAYMENT_FREQUENCIES.find(f => f.value === inputs.paymentFrequency)?.label || inputs.paymentFrequency}</span>
              </div>
              <div class="item">
                <span class="label">Effective Amortization:</span>
                <span class="value">${results.effectiveAmortization.toFixed(2)} years</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="section">
          <h2>Payment Information</h2>
          <div class="grid">
            <div>
              <div class="item">
                <span class="label">Monthly Payment:</span>
                <span class="value">${formatCurrency(results.monthlyPayment)}</span>
              </div>
              <div class="item">
                <span class="label">Total Monthly Expenses:</span>
                <span class="value">${formatCurrency(results.totalMonthlyExpenses)}</span>
              </div>
            </div>
            <div>
              <div class="item">
                <span class="label">Total Closing Costs:</span>
                <span class="value">${formatCurrency(results.closingCosts)}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="footer">
          <p>Generated on ${new Date().toLocaleDateString()} | This is an estimate only. Please consult with your mortgage professional for personalized advice.</p>
        </div>
      </body>
      </html>
    `;
    
    // Write HTML to new window
    printWindow.document.open();
    printWindow.document.write(content);
    printWindow.document.close();
    
    // Trigger print when loaded
    printWindow.onload = function() {
      printWindow.print();
    };
  };

  // Accordion component for mobile view
  const Accordion = ({ title, children, isExpanded, onToggle }: { 
    title: string; 
    children: React.ReactNode; 
    isExpanded: boolean; 
    onToggle: () => void;
  }) => {
    if (!isMobile) return <div className="p-4 bg-gray-50 rounded">{children}</div>;
    
    return (
      <div className="border border-gray-200 rounded-lg mb-4 overflow-hidden">
        <button 
          className={`w-full flex justify-between items-center p-4 text-left transition ${isExpanded ? 'bg-blue-50' : 'bg-gray-50'}`}
          onClick={onToggle}
        >
          <span className="font-medium">{title}</span>
          <svg 
            className={`w-5 h-5 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>
        {isExpanded && (
          <div className="p-4 border-t border-gray-200">
            {children}
          </div>
        )}
      </div>
    );
  };

  // Result card component for mobile view
  const ResultCard = ({ title, value, subtitle }: { 
    title: string; 
    value: string | React.ReactNode; 
    subtitle?: string | React.ReactNode;
  }) => {
    return (
      <div className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition">
        <h3 className="text-sm text-gray-500">{title}</h3>
        <p className="text-xl font-bold">{value}</p>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
    );
  };

  // Render input field with label
  const renderInput = (name: keyof Inputs, label: string, prefix: string, type = 'number') => {
    return (
      <div>
        <label className="block text-sm font-medium mb-1">{label}</label>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">{prefix}</span>
          <input
            type={type}
            inputMode={type === 'number' ? 'decimal' : 'text'}
            className={`w-full pl-8 pr-4 py-${isMobile ? '3' : '2'} border rounded${isMobile ? '-lg text-base' : ''}`}
            value={inputs[name] === '' ? '' : inputs[name]}
            onChange={(e) => handleInputChange(name, e.target.value)}
            onBlur={() => handleBlur(name)}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white p-4 md:p-6 rounded-xl border border-gray-200 shadow-sm w-full max-w-6xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold text-blue-800 mb-6">Mortgage Calculator</h1>
      
      {/* Mobile-optimized tabs */}
      <div className="mb-6 overflow-x-auto">
        <div className={`flex ${isMobile ? 'space-x-1 min-w-full' : 'space-x-4 flex-wrap'} p-1 bg-gray-50 rounded-lg`}>
          <button 
            className={`py-2 px-4 rounded-md transition-all duration-200 ${activeTab === 'summary' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-200'}`}
            onClick={() => setActiveTab('summary')}
          >
            Summary
          </button>
          <button 
            className={`py-2 px-4 rounded-md transition-all duration-200 ${activeTab === 'expenses' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-200'}`}
            onClick={() => setActiveTab('expenses')}
          >
            {isMobile ? 'Expenses' : 'Monthly Expenses'}
          </button>
          <button 
            className={`py-2 px-4 rounded-md transition-all duration-200 ${activeTab === 'prepayment' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-200'}`}
            onClick={() => setActiveTab('prepayment')}
          >
            Prepayment
          </button>
          <button 
            className={`py-2 px-4 rounded-md transition-all duration-200 ${activeTab === 'closingCosts' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-200'}`}
            onClick={() => setActiveTab('closingCosts')}
          >
            Closing Costs
          </button>
          {!isMobile && (
            <button 
              className={`py-2 px-4 rounded-md transition-all duration-200 ${activeTab === 'amortization' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-200'}`}
              onClick={() => setActiveTab('amortization')}
            >
              Amortization
            </button>
          )}
        </div>
      </div>
      
      {/* Main content with conditional layout based on device */}
      <div className={isMobile ? '' : 'grid grid-cols-1 lg:grid-cols-3 gap-6'}>
        {/* Input section */}
        <div className={isMobile ? '' : 'lg:col-span-1 space-y-4'}>
          {(activeTab === 'summary') && (
            <>
              <Accordion 
                title="Property Details" 
                isExpanded={isMobile ? expandedSection === 'property' : true} 
                onToggle={() => toggleSection('property')}
              >
                <div className="space-y-4">
                  {renderInput('purchasePrice', 'Purchase Price', '$')}
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Down Payment</label>
                    <div className="flex space-x-2">
                      <div className="relative flex-1">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                          {inputs.downPaymentType === 'amount' ? '$' : '%'}
                        </span>
                        <input
                          type="number"
                          inputMode="decimal"
                          className={`w-full pl-8 pr-4 py-${isMobile ? '3' : '2'} border rounded${isMobile ? '-lg text-base' : ''}`}
                          value={inputs.downPayment === '' ? '' : inputs.downPayment}
                          onChange={(e) => handleInputChange('downPayment', e.target.value)}
                          onBlur={() => handleBlur('downPayment')}
                        />
                      </div>
                      <select
                        className={`border rounded${isMobile ? '-lg' : ''} px-3 py-${isMobile ? '3' : '2'}`}
                        value={inputs.downPaymentType}
                        onChange={(e) => handleInputChange('downPaymentType', e.target.value as 'amount' | 'percent')}
                      >
                        <option value="amount">$</option>
                        <option value="percent">%</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Province</label>
                    <select
                      className={`w-full border rounded${isMobile ? '-lg' : ''} px-4 py-${isMobile ? '3' : '2'}`}
                      value={inputs.province}
                      onChange={(e) => {
                        const newProvince = e.target.value;
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
                    <label className="block text-sm font-medium mb-1">Municipality</label>
                    <select
                      className={`w-full border rounded${isMobile ? '-lg' : ''} px-4 py-${isMobile ? '3' : '2'}`}
                      value={inputs.municipality}
                      onChange={(e) => handleInputChange('municipality', e.target.value)}
                    >
                      {(MUNICIPALITIES[inputs.province] || MUNICIPALITIES['default']).map(municipality => (
                        <option key={municipality.value} value={municipality.value}>{municipality.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Property Type</label>
                    <select
                      className={`w-full border rounded${isMobile ? '-lg' : ''} px-4 py-${isMobile ? '3' : '2'}`}
                      value={inputs.propertyType}
                      onChange={(e) => handleInputChange('propertyType', e.target.value)}
                    >
                      {PROPERTY_TYPES.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </Accordion>
              
              <Accordion 
                title="Mortgage Details" 
                isExpanded={isMobile ? expandedSection === 'mortgage' : true} 
                onToggle={() => toggleSection('mortgage')}
              >
                <div className="space-y-4">
                  {renderInput('interestRate', 'Interest Rate (%)', '%')}
                  
                  <div className={isMobile ? '' : 'grid grid-cols-2 gap-4'}>
                    <div>
                      <label className="block text-sm font-medium mb-1">Amortization</label>
                      <select
                        className={`w-full border rounded${isMobile ? '-lg' : ''} px-4 py-${isMobile ? '3' : '2'}`}
                        value={inputs.amortizationPeriod}
                        onChange={(e) => handleInputChange('amortizationPeriod', Number(e.target.value))}
                      >
                        {AMORTIZATION_PERIODS.map(period => (
                          <option key={period.value} value={period.value}>{period.label}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className={isMobile ? 'mt-4' : ''}>
                      <label className="block text-sm font-medium mb-1">Term</label>
                      <select
                        className={`w-full border rounded${isMobile ? '-lg' : ''} px-4 py-${isMobile ? '3' : '2'}`}
                        value={inputs.term}
                        onChange={(e) => handleInputChange('term', Number(e.target.value))}
                      >
                        {TERM_LENGTHS.map(term => (
                          <option key={term.value} value={term.value}>{term.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Payment Frequency</label>
                    <select
                      className={`w-full border rounded${isMobile ? '-lg' : ''} px-4 py-${isMobile ? '3' : '2'}`}
                      value={inputs.paymentFrequency}
                      onChange={(e) => handleInputChange('paymentFrequency', e.target.value)}
                    >
                      {PAYMENT_FREQUENCIES.map(frequency => (
                        <option key={frequency.value} value={frequency.value}>{frequency.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className={`${isMobile ? 'flex flex-col space-y-2' : 'grid grid-cols-2 gap-4'}`}>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="firstTimeBuyer"
                        className={`h-${isMobile ? '5' : '4'} w-${isMobile ? '5' : '4'} mr-2`}
                        checked={inputs.firstTimeBuyer}
                        onChange={(e) => handleInputChange('firstTimeBuyer', e.target.checked)}
                      />
                      <label htmlFor="firstTimeBuyer" className="text-sm">First-time Buyer</label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="newlyBuiltHome"
                        className={`h-${isMobile ? '5' : '4'} w-${isMobile ? '5' : '4'} mr-2`}
                        checked={inputs.newlyBuiltHome}
                        onChange={(e) => handleInputChange('newlyBuiltHome', e.target.checked)}
                      />
                      <label htmlFor="newlyBuiltHome" className="text-sm">Newly Built Home</label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="foreignBuyer"
                        className={`h-${isMobile ? '5' : '4'} w-${isMobile ? '5' : '4'} mr-2`}
                        checked={inputs.foreignBuyer}
                        onChange={(e) => handleInputChange('foreignBuyer', e.target.checked)}
                      />
                      <label htmlFor="foreignBuyer" className="text-sm">Foreign Buyer</label>
                    </div>
                  </div>
                </div>
              </Accordion>
            </>
          )}
          
          {activeTab === 'expenses' && (
            <Accordion 
              title="Monthly Expenses" 
              isExpanded={true}
              onToggle={() => {}}
            >
              <div className="space-y-4">
                {renderInput('propertyTaxes', 'Property Taxes (Annual)', '$')}
                {renderInput('condoFees', 'Condo Fees (Monthly)', '$')}
                {renderInput('homeInsurance', 'Home Insurance (Annual)', '$')}
                {renderInput('utilities', 'Utilities (Monthly)', '$')}
                {renderInput('maintenance', 'Maintenance (% of home value annually)', '%')}
              </div>
            </Accordion>
          )}
          
          {activeTab === 'prepayment' && (
            <Accordion 
              title="Prepayment Options" 
              isExpanded={true}
              onToggle={() => {}}
            >
              <div className="space-y-4">
                {renderInput('extraPayment', 'Extra Payment Per Period', '$')}
                {renderInput('paymentIncrease', 'Payment Increase (%)', '%')}
                {renderInput('annualPrepayment', 'Annual Lump Sum (% of original principal)', '%')}
              </div>
            </Accordion>
          )}
          
          {activeTab === 'closingCosts' && (
            <Accordion 
              title="Closing Cost Details" 
              isExpanded={true}
              onToggle={() => {}}
            >
              <div className="space-y-4">
                {renderInput('legalFees', 'Legal Fees', '$')}
                {renderInput('titleInsurance', 'Title Insurance', '$')}
                {renderInput('homeInspection', 'Home Inspection', '$')}
                {renderInput('appraisalFee', 'Appraisal Fee', '$')}
                {renderInput('brokerageFee', 'Brokerage Fee', '$')}
                {renderInput('lenderFee', 'Lender Fee', '$')}
                {renderInput('movingCosts', 'Moving Costs', '$')}
              </div>
            </Accordion>
          )}
        </div>
        
        {/* Results section */}
        <div className={isMobile ? 'mt-6' : 'lg:col-span-2'}>
          {activeTab === 'summary' && (
            <div>
              {/* Mobile-only result cards */}
              {isMobile && (
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <ResultCard 
                    title="Monthly Payment" 
                    value={formatCurrency(results.monthlyPayment)} 
                  />
                  <ResultCard 
                    title="Total Mortgage" 
                    value={formatCurrency(results.totalMortgage)} 
                  />
                  <ResultCard 
                    title="Interest Rate" 
                    value={formatPercent(typeof inputs.interestRate === 'number' ? inputs.interestRate : 0)} 
                  />
                  <ResultCard 
                    title="Down Payment" 
                    value={`${results.downPaymentPercent.toFixed(1)}%`} 
                    subtitle={formatCurrency(
                      inputs.downPaymentType === 'amount' 
                        ? (typeof inputs.downPayment === 'number' ? inputs.downPayment : 0)
                        : (typeof inputs.purchasePrice === 'number' ? inputs.purchasePrice : 0) * 
                          (typeof inputs.downPayment === 'number' ? inputs.downPayment : 0) / 100
                    )}
                  />
                  <ResultCard 
                    title="Amortization" 
                    value={`${inputs.amortizationPeriod} years`} 
                    subtitle={`Term: ${inputs.term} years`}
                  />
                  <ResultCard 
                    title="Closing Costs" 
                    value={formatCurrency(results.closingCosts)} 
                  />
                </div>
              )}
              
              {/* Desktop summary or shared view */}
              {!isMobile && (
                <div className="bg-blue-50 p-6 rounded-lg mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-blue-800 mb-4">Key Details</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Purchase Price:</span>
                          <span className="font-semibold">{formatCurrency(typeof inputs.purchasePrice === 'number' ? inputs.purchasePrice : 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Down Payment:</span>
                          <span className="font-semibold">
                            {inputs.downPaymentType === 'amount'
                              ? formatCurrency(typeof inputs.downPayment === 'number' ? inputs.downPayment : 0)
                              : formatCurrency((typeof inputs.purchasePrice === 'number' ? inputs.purchasePrice : 0) * (typeof inputs.downPayment === 'number' ? inputs.downPayment : 0) / 100)
                            } ({results.downPaymentPercent.toFixed(2)}%)
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Mortgage Amount:</span>
                          <span className="font-semibold">{formatCurrency(results.mortgageAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Mortgage Insurance:</span>
                          <span className="font-semibold">{formatCurrency(results.mortgageInsurance)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Mortgage:</span>
                          <span className="font-semibold">{formatCurrency(results.totalMortgage)}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-blue-800 mb-4">Payment Details</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Payment:</span>
                          <span className="font-semibold">{formatCurrency(results.monthlyPayment)} monthly</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Principal:</span>
                          <span className="font-semibold">{formatCurrency(results.principalPerPayment)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Interest:</span>
                          <span className="font-semibold">{formatCurrency(results.interestPerPayment)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Monthly Cost:</span>
                          <span className="font-semibold">{formatCurrency(results.totalMonthlyExpenses)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Mobile accordion for payment breakdown */}
              {isMobile && (
                <Accordion 
                  title="Payment Breakdown" 
                  isExpanded={expandedSection === 'breakdown'} 
                  onToggle={() => toggleSection('breakdown')}
                >
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-700">Mortgage Payment:</span>
                        <span className="font-semibold">{formatCurrency(results.monthlyPayment)}</span>
                      </div>
                      <div className="text-sm text-gray-600 pl-4">
                        <div className="flex justify-between">
                          <span>Principal:</span>
                          <span>{formatCurrency(results.principalPerPayment)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Interest:</span>
                          <span>{formatCurrency(results.interestPerPayment)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-700">Interest Over Term:</span>
                      <span className="font-semibold">{formatCurrency(results.interestPaidOverTerm)}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-700">End of Term Balance:</span>
                      <span className="font-semibold">{formatCurrency(results.balanceAtEndOfTerm)}</span>
                    </div>
                  </div>
                </Accordion>
              )}
              
              {/* Shared chart */}
              <div className={`bg-white ${!isMobile ? 'border' : ''} rounded p-4 mb-6`}>
                <h3 className="text-lg font-semibold mb-4">Payment Breakdown</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={results.amortizationSchedule}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
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
              
              {/* Calculation Summary - Desktop only */}
              {!isMobile && (
                <div className="bg-white border rounded p-4">
                  <h3 className="text-lg font-semibold mb-4">Calculation Summary</h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>Mortgage Amount: {formatCurrency(results.mortgageAmount)}</p>
                    <p>Interest Rate: {formatPercent(typeof inputs.interestRate === 'number' ? inputs.interestRate : 0)}</p>
                    <p>Amortization: {inputs.amortizationPeriod} years</p>
                    <p>Payment Frequency: {PAYMENT_FREQUENCIES.find(f => f.value === inputs.paymentFrequency)?.label}</p>
                    <p>Total Cost Over Amortization: {formatCurrency(results.totalMortgage + results.interestPaidOverTerm)}</p>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'expenses' && (
            <div className="bg-white border rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">Monthly Expenses Breakdown</h3>
              
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded">
                  <div className="flex justify-between mb-2">
                    <span className="font-semibold">Mortgage Payment</span>
                    <span className="font-semibold">{formatCurrency(results.monthlyPayment)}</span>
                  </div>
                  <div className="pl-4 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Principal:</span>
                      <span>{formatCurrency(results.principalPerPayment)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Interest:</span>
                      <span>{formatCurrency(results.interestPerPayment)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-gray-50 rounded">
                  <div className="flex justify-between mb-2">
                    <span className="font-semibold">Property Expenses</span>
                    <span className="font-semibold">{formatCurrency(
                      (typeof inputs.propertyTaxes === 'number' ? inputs.propertyTaxes : 0) / 12 + 
                      (typeof inputs.condoFees === 'number' ? inputs.condoFees : 0)
                    )}</span>
                  </div>
                  <div className="pl-4 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Property Taxes:</span>
                      <span>{formatCurrency((typeof inputs.propertyTaxes === 'number' ? inputs.propertyTaxes : 0) / 12)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Condo Fees:</span>
                      <span>{formatCurrency(typeof inputs.condoFees === 'number' ? inputs.condoFees : 0)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-gray-50 rounded">
                  <div className="flex justify-between mb-2">
                    <span className="font-semibold">Other Expenses</span>
                    <span className="font-semibold">{formatCurrency(
                      (typeof inputs.homeInsurance === 'number' ? inputs.homeInsurance : 0) / 12 + 
                      (typeof inputs.utilities === 'number' ? inputs.utilities : 0) + 
                      ((typeof inputs.purchasePrice === 'number' ? inputs.purchasePrice : 0) * 
                      (typeof inputs.maintenance === 'number' ? inputs.maintenance : 0) / 100) / 12
                    )}</span>
                  </div>
                  <div className="pl-4 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Home Insurance:</span>
                      <span>{formatCurrency((typeof inputs.homeInsurance === 'number' ? inputs.homeInsurance : 0) / 12)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Utilities:</span>
                      <span>{formatCurrency(typeof inputs.utilities === 'number' ? inputs.utilities : 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Maintenance:</span>
                      <span>{formatCurrency(
                        ((typeof inputs.purchasePrice === 'number' ? inputs.purchasePrice : 0) * 
                        (typeof inputs.maintenance === 'number' ? inputs.maintenance : 0) / 100) / 12
                      )}</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-blue-100 rounded">
                  <div className="flex justify-between">
                    <span className="font-semibold">Total Monthly Cost</span>
                    <span className="font-semibold">{formatCurrency(results.totalMonthlyExpenses)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'prepayment' && (
            <div className="bg-white border rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">Prepayment Impact</h3>
              
              <div className="space-y-4">
                <div className="p-3 bg-blue-50 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span>Original Amortization:</span>
                    <span className="font-medium">{inputs.amortizationPeriod} years</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Effective Amortization:</span>
                    <span className="font-medium">{results.effectiveAmortization.toFixed(2)} years</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Time Saved:</span>
                    <span className="font-medium text-green-600">{results.timeShaved.toFixed(2)} years</span>
                  </div>
                </div>
                
                <div className="p-3 bg-green-50 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span>Interest Savings Over Term:</span>
                    <span className="font-medium text-green-600">{formatCurrency(results.interestSavingsOverTerm)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Interest Savings:</span>
                    <span className="font-medium text-green-600">{formatCurrency(results.interestSavingsOverAmortization)}</span>
                  </div>
                </div>
                
                <div className="h-48 mt-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={prepareComparisonData()}
                      margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="standardBalance"
                        name="Standard"
                        stroke="#9333ea"
                        activeDot={{ r: 8 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="acceleratedBalance"
                        name="With Prepayments"
                        stroke="#10b981"
                        activeDot={{ r: 8 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'closingCosts' && (
            <div className="bg-white border rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">Closing Costs Summary</h3>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Land Transfer Tax</span>
                  <span>{formatCurrency(calculateLandTransferTax(
                    typeof inputs.purchasePrice === 'number' ? inputs.purchasePrice : 0, 
                    inputs.province, 
                    inputs.municipality, 
                    inputs.firstTimeBuyer
                  ).total)}</span>
                </div>
                
                {inputs.foreignBuyer && (
                  <div className="flex justify-between">
                    <span>Foreign Buyer Tax</span>
                    <span>{formatCurrency(calculateForeignBuyerTax(
                      typeof inputs.purchasePrice === 'number' ? inputs.purchasePrice : 0, 
                      inputs.province, 
                      inputs.municipality, 
                      inputs.foreignBuyer
                    ))}</span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span>Mortgage Insurance</span>
                  <span>{formatCurrency(results.mortgageInsurance)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span>Legal Fees</span>
                  <span>{formatCurrency(typeof inputs.legalFees === 'number' ? inputs.legalFees : 0)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span>Title Insurance</span>
                  <span>{formatCurrency(typeof inputs.titleInsurance === 'number' ? inputs.titleInsurance : 0)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span>Home Inspection</span>
                  <span>{formatCurrency(typeof inputs.homeInspection === 'number' ? inputs.homeInspection : 0)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span>Moving Costs</span>
                  <span>{formatCurrency(typeof inputs.movingCosts === 'number' ? inputs.movingCosts : 0)}</span>
                </div>
                
                {results.mortgageInsurance > 0 && (inputs.province === 'ON' || inputs.province === 'QC') && (
                  <div className="flex justify-between">
                    <span>PST on Mortgage Insurance</span>
                    <span>{formatCurrency(results.mortgageInsurance * 0.08)}</span>
                  </div>
                )}
                
                <div className="flex justify-between pt-3 mt-2 border-t font-semibold">
                  <span>Total Closing Costs</span>
                  <span>{formatCurrency(results.closingCosts)}</span>
                </div>
              </div>
              
              {inputs.foreignBuyer && (
                <div className="mt-4 p-3 bg-yellow-50 rounded-lg text-sm">
                  <p className="font-medium text-yellow-800">Foreign Buyer Requirements:</p>
                  <ul className="list-disc pl-5 mt-1 text-yellow-700">
                    <li>Minimum down payment: 35% of the purchase price</li>
                    <li>Additional taxes apply in many provinces</li>
                    <li>Not eligible for most government homebuyer incentives</li>
                  </ul>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'amortization' && !isMobile && (
            <div>
              <div className="bg-white border rounded p-4 mb-6">
                <h3 className="text-lg font-semibold mb-4">Amortization Schedule</h3>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Starting Balance</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Principal Paid</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interest Paid</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Extra Payments</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ending Balance</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {results.amortizationSchedule.map((year) => (
                        <tr key={year.year}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{year.year}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(year.startingBalance)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(year.principalPaid)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(year.interestPaid)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(year.extraPayments)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(year.endingBalance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="bg-white border rounded p-4">
                <h3 className="text-lg font-semibold mb-4">Balance Projection</h3>
                
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={results.amortizationSchedule}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
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
      
      {/* Footer with export button */}
      <div className={`mt-8 ${isMobile ? 'flex flex-col space-y-4' : 'flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0'}`}>
        <button 
          onClick={generatePDF}
          className={`bg-blue-600 hover:bg-blue-700 text-white px-${isMobile ? '4' : '6'} py-3 rounded-lg flex items-center ${isMobile ? 'justify-center' : ''} font-medium shadow-md transition`}
        >
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
          </svg>
          Export as PDF
        </button>
        
        <p className="text-xs text-gray-500 text-center">
          This calculator provides estimates only and should not be considered financial advice. 
          Consult with a mortgage professional for accurate information.
        </p>
      </div>
    </div>
  );
};

export default ResponsiveMortgageCalculator;
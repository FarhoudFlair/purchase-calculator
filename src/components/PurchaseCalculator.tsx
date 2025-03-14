'use client'

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Constants and utility functions
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

// Cities with municipal land transfer taxes
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

interface ComparisonData {
  originalAmortization: number;
  originalInterestPaid: number;
}

// Main calculator component
const PurchaseCalculator = () => {
  // State for inputs
  const [inputs, setInputs] = useState<Inputs>({
    purchasePrice: 500000,
    downPayment: 100000,
    downPaymentType: 'amount', // 'amount' or 'percent'
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
    legalFees: 0,
    titleInsurance: 0,
    homeInspection: 0,
    appraisalFee: 0,
    brokerageFee: 0,
    lenderFee: 0,
    movingCosts: 0
  });
  
  // State for input validity
  const [inputErrors, setInputErrors] = useState<Record<string, boolean>>({});

  // State for calculated results
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

  // State for tabs
  const [activeTab, setActiveTab] = useState('summary');
  
  // Additional state for comparison data
  const [comparisonData, setComparisonData] = useState<ComparisonData>({
    originalAmortization: 0,
    originalInterestPaid: 0
  });

  // Handle input changes with validation
  const handleInputChange = (name: keyof Inputs, value: any) => {
    // Handle empty or invalid values
    if (value === '' || isNaN(value)) {
      setInputs(prev => ({ ...prev, [name]: '' }));
      return;
    }
    
    // For numeric fields
    if (typeof inputs[name] === 'number') {
      // Convert to number and prevent leading zeros
      value = String(value).replace(/^0+(?=\d)/, '');
      value = Number(value);
    }
    
    let updatedInputs = { ...inputs, [name]: value };

    // Update related values
    if (name === 'purchasePrice' && inputs.downPaymentType === 'percent') {
      const purchasePrice = typeof value === 'number' ? value : 0;
      const downPaymentPercent = typeof inputs.downPayment === 'number' ? inputs.downPayment : 0;
      updatedInputs.downPayment = Math.round(purchasePrice * (downPaymentPercent / 100) / 100) * 100;
    } else if (name === 'downPayment') {
      if (inputs.downPaymentType === 'percent') {
        if (value > 100) value = 100;
        updatedInputs.downPayment = value;
      } else {
        const purchasePrice = typeof inputs.purchasePrice === 'number' ? inputs.purchasePrice : 0;
        if (value > purchasePrice) value = purchasePrice;
        updatedInputs.downPayment = value;
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

  // Handle blur event to validate and format
  const handleBlur = (name: keyof Inputs) => {
    // Handle empty values
    if (inputs[name] === '') {
      setInputs(prev => ({ ...prev, [name]: 0 }));
      return;
    }
    
    // Make sure numeric values are valid
    if (typeof inputs[name] === 'number' && isNaN(inputs[name] as number)) {
      setInputs(prev => ({ ...prev, [name]: 0 }));
    }
  };

  // Calculate mortgage details whenever inputs change
  useEffect(() => {
    if (Object.values(inputs).some(value => value === '')) {
      // Skip calculation if any input is empty
      return;
    }
    
    calculateMortgage();
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
    let yearlySchedule: YearlyScheduleItem[] = [];
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

  // Calculate land transfer tax based on province, municipality and property value
  const calculateLandTransferTax = (propertyValue: number, province: string, municipality: string, firstTimeBuyer: boolean): LandTransferTaxResult => {
    let provincialTax = 0;
    let municipalTax = 0;
    let taxDetails: LandTransferTaxDetails = {
      provincial: { value: 0, name: "" },
      municipal: { value: 0, name: "" }
    };

    // Calculate provincial tax
    switch (province) {
      case 'ON':
        // Ontario calculation
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
        
        // First-time homebuyer rebate (Ontario)
        if (firstTimeBuyer) {
          const rebate = Math.min(4000, provincialTax);
          provincialTax = Math.max(0, provincialTax - rebate);
        }
        break;
      
      case 'BC':
        // BC calculation
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
        
        // First-time homebuyer exemption (BC)
        if (firstTimeBuyer && propertyValue <= 500000) {
          provincialTax = 0;
        } else if (firstTimeBuyer && propertyValue <= 525000) {
          const rebate = (525000 - propertyValue) / 25000 * provincialTax;
          provincialTax -= rebate;
        }
        break;
      
      case 'QC':
        // Quebec calculation
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
        // Alberta has no provincial land transfer tax
        taxDetails.provincial.name = "Alberta Transfer Fee";
        provincialTax = 0;
        break;
      
      case 'NS':
        // Nova Scotia
        taxDetails.provincial.name = "Nova Scotia Deed Transfer Tax";
        provincialTax = propertyValue * 0.015;
        break;
      
      // Add more provinces as needed
      default:
        // Default conservative estimate for other provinces
        taxDetails.provincial.name = "Provincial Transfer Tax";
        provincialTax = propertyValue * 0.015;
    }
    
    taxDetails.provincial.value = provincialTax;
    
    // Calculate municipal tax based on municipality
    if (province === 'ON' && municipality === 'toronto') {
      // Toronto Municipal Land Transfer Tax
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
      
      // First-time buyer rebate for Toronto
      if (firstTimeBuyer) {
        const rebate = Math.min(4475, municipalTax);
        municipalTax = Math.max(0, municipalTax - rebate);
      }
    } else if (province === 'QC' && municipality === 'montreal') {
      // Montreal has additional rates for higher value properties
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
      // Halifax has its own tax rate
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
    // For foreign buyers, minimum is typically 35%
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

    // First generate standard amortization schedule (without prepayments)
    const extraPayment = typeof inputs.extraPayment === 'number' ? inputs.extraPayment : 0;
    const paymentIncrease = typeof inputs.paymentIncrease === 'number' ? inputs.paymentIncrease : 0;
    const annualPrepayment = typeof inputs.annualPrepayment === 'number' ? inputs.annualPrepayment : 0;
    
    const standardSchedule = generateAmortizationSchedule(
      totalMortgage, 
      interestRate, 
      inputs.amortizationPeriod, 
      paymentAmount, 
      paymentsPerYear, 
      inputs.term,
      0, // No extra payment
      0, // No payment increase
      0  // No annual prepayment
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

    // Update comparison data for charts
    setComparisonData({
      originalAmortization,
      originalInterestPaid
    });

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
      const dataPoint = { year: i + 1 };
      
      // Add standard schedule balance if available
      if (i < results.standardAmortizationSchedule.length) {
        dataPoint.standardBalance = results.standardAmortizationSchedule[i].endingBalance;
      } else {
        dataPoint.standardBalance = 0;
      }
      
      // Add accelerated schedule balance if available
      if (i < results.amortizationSchedule.length) {
        dataPoint.acceleratedBalance = results.amortizationSchedule[i].endingBalance;
      } else {
        dataPoint.acceleratedBalance = 0;
      }
      
      data.push(dataPoint);
    }
    
    return data;
  };

  // Function to generate a printable PDF version
  const generatePDF = () => {
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      alert('Please allow popups to export the PDF');
      return;
    }
    
    // Create a stylish HTML content for the PDF
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
                <span class="label">Principal Per Payment:</span>
                <span class="value">${formatCurrency(results.principalPerPayment)}</span>
              </div>
              <div class="item">
                <span class="label">Interest Per Payment:</span>
                <span class="value">${formatCurrency(results.interestPerPayment)}</span>
              </div>
            </div>
            <div>
              <div class="item">
                <span class="label">Interest Over Term:</span>
                <span class="value">${formatCurrency(results.interestPaidOverTerm)}</span>
              </div>
              <div class="item">
                <span class="label">Balance at End of Term:</span>
                <span class="value">${formatCurrency(results.balanceAtEndOfTerm)}</span>
              </div>
              <div class="item total">
                <span class="label">Total Monthly Expenses:</span>
                <span class="value">${formatCurrency(results.totalMonthlyExpenses)}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="section">
          <h2>Closing Costs</h2>
          <div class="item">
            <span class="label">Land Transfer Tax:</span>
            <span class="value">${formatCurrency(calculateLandTransferTax(
              typeof inputs.purchasePrice === 'number' ? inputs.purchasePrice : 0, 
              inputs.province, 
              inputs.municipality, 
              inputs.firstTimeBuyer
            ).total)}</span>
          </div>
          ${inputs.foreignBuyer ? `
          <div class="item">
            <span class="label">Foreign Buyer Tax:</span>
            <span class="value">${formatCurrency(calculateForeignBuyerTax(
              typeof inputs.purchasePrice === 'number' ? inputs.purchasePrice : 0, 
              inputs.province, 
              inputs.municipality, 
              inputs.foreignBuyer
            ))}</span>
          </div>
          ` : ''}
          <div class="item">
            <span class="label">PST on Mortgage Insurance:</span>
            <span class="value">${formatCurrency((inputs.province === 'ON' || inputs.province === 'QC') ? results.mortgageInsurance * 0.08 : 0)}</span>
          </div>
          ${typeof inputs.legalFees === 'number' && inputs.legalFees > 0 ? `
          <div class="item">
            <span class="label">Legal Fees:</span>
            <span class="value">${formatCurrency(inputs.legalFees)}</span>
          </div>
          ` : ''}
          ${typeof inputs.titleInsurance === 'number' && inputs.titleInsurance > 0 ? `
          <div class="item">
            <span class="label">Title Insurance:</span>
            <span class="value">${formatCurrency(inputs.titleInsurance)}</span>
          </div>
          ` : ''}
          ${typeof inputs.homeInspection === 'number' && inputs.homeInspection > 0 ? `
          <div class="item">
            <span class="label">Home Inspection:</span>
            <span class="value">${formatCurrency(inputs.homeInspection)}</span>
          </div>
          ` : ''}
          ${typeof inputs.appraisalFee === 'number' && inputs.appraisalFee > 0 ? `
          <div class="item">
            <span class="label">Appraisal Fee:</span>
            <span class="value">${formatCurrency(inputs.appraisalFee)}</span>
          </div>
          ` : ''}
          ${typeof inputs.brokerageFee === 'number' && inputs.brokerageFee > 0 ? `
          <div class="item">
            <span class="label">Brokerage Fee:</span>
            <span class="value">${formatCurrency(inputs.brokerageFee)}</span>
          </div>
          ` : ''}
          ${typeof inputs.lenderFee === 'number' && inputs.lenderFee > 0 ? `
          <div class="item">
            <span class="label">Lender Fee:</span>
            <span class="value">${formatCurrency(inputs.lenderFee)}</span>
          </div>
          ` : ''}
          ${typeof inputs.movingCosts === 'number' && inputs.movingCosts > 0 ? `
          <div class="item">
            <span class="label">Moving Costs:</span>
            <span class="value">${formatCurrency(inputs.movingCosts)}</span>
          </div>
          ` : ''}
          <div class="item total">
            <span class="label">Total Closing Costs:</span>
            <span class="value">${formatCurrency(results.closingCosts)}</span>
          </div>
        </div>
        
        ${(typeof inputs.extraPayment === 'number' && inputs.extraPayment > 0) || 
          (typeof inputs.paymentIncrease === 'number' && inputs.paymentIncrease > 0) || 
          (typeof inputs.annualPrepayment === 'number' && inputs.annualPrepayment > 0) ? `
        <div class="section highlight">
          <h2>Prepayment Benefits</h2>
          <div class="grid">
            <div>
              <div class="item">
                <span class="label">Interest Savings Over Term:</span>
                <span class="value">${formatCurrency(results.interestSavingsOverTerm)}</span>
              </div>
              <div class="item">
                <span class="label">Interest Savings Over Amortization:</span>
                <span class="value">${formatCurrency(results.interestSavingsOverAmortization)}</span>
              </div>
            </div>
            <div>
              <div class="item">
                <span class="label">Original Amortization:</span>
                <span class="value">${inputs.amortizationPeriod} years</span>
              </div>
              <div class="item">
                <span class="label">Time Saved:</span>
                <span class="value">${results.timeShaved.toFixed(2)} years</span>
              </div>
            </div>
          </div>
        </div>
        ` : ''}
        
        <div class="footer">
          <p>Generated on ${new Date().toLocaleDateString()} | This is an estimate only. Please consult with your mortgage professional for personalized advice.</p>
        </div>
      </body>
      </html>
    `;
    
    // Write the HTML content to the new window
    printWindow.document.open();
    printWindow.document.write(content);
    printWindow.document.close();
    
    // Trigger print when loaded
    printWindow.onload = function() {
      printWindow.print();
    };
  };

  return (
    <div className="bg-white shadow-lg rounded-xl p-6 max-w-6xl mx-auto border border-gray-100">
      <h1 className="text-3xl font-bold text-blue-800 mb-6">Mortgage Calculator</h1>
      
      {/* Main tabs */}
      <div className="mb-8">
        <div className="flex flex-wrap space-x-1 md:space-x-4 overflow-x-auto bg-gray-50 p-1 rounded-lg">
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
            Monthly Expenses
          </button>
          <button 
            className={`py-2 px-4 rounded-md transition-all duration-200 ${activeTab === 'prepayment' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-200'}`}
            onClick={() => setActiveTab('prepayment')}
          >
            Prepayment Options
          </button>
          <button 
            className={`py-2 px-4 rounded-md transition-all duration-200 ${activeTab === 'closingCosts' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-200'}`}
            onClick={() => setActiveTab('closingCosts')}
          >
            Closing Costs
          </button>
          <button 
            className={`py-2 px-4 rounded-md transition-all duration-200 ${activeTab === 'amortization' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-200'}`}
            onClick={() => setActiveTab('amortization')}
          >
            Amortization
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input section */}
        <div className="lg:col-span-1 space-y-4">
          {(activeTab === 'summary') && (
            <div className="p-4 bg-gray-50 rounded">
              <h2 className="text-lg font-semibold mb-4">Property Details</h2>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Purchase Price</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                  <input
                    type="number"
                    className="w-full pl-8 pr-4 py-2 border rounded"
                    value={inputs.purchasePrice === '' ? '' : inputs.purchasePrice}
                    onChange={(e) => handleInputChange('purchasePrice', e.target.value)}
                    onBlur={() => handleBlur('purchasePrice')}
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Down Payment</label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                      {inputs.downPaymentType === 'amount' ? '$' : '%'}
                    </span>
                    <input
                      type="number"
                      className="w-full pl-8 pr-4 py-2 border rounded"
                      value={inputs.downPayment === '' ? '' : inputs.downPayment}
                      onChange={(e) => handleInputChange('downPayment', e.target.value)}
                      onBlur={() => handleBlur('downPayment')}
                    />
                  </div>
                  <select
                    className="border rounded px-3 py-2"
                    value={inputs.downPaymentType}
                    onChange={(e) => handleInputChange('downPaymentType', e.target.value as 'amount' | 'percent')}
                  >
                    <option value="amount">$</option>
                    <option value="percent">%</option>
                  </select>
                </div>
                <div className="mt-1 text-sm text-gray-500">
                  {inputs.downPaymentType === 'amount' && typeof inputs.purchasePrice === 'number' && inputs.purchasePrice > 0 && typeof inputs.downPayment === 'number'
                    ? `(${((inputs.downPayment / inputs.purchasePrice) * 100).toFixed(2)}%)`
                    : inputs.downPaymentType === 'percent' && typeof inputs.purchasePrice === 'number' && inputs.purchasePrice > 0 && typeof inputs.downPayment === 'number'
                    ? `(${formatCurrency(inputs.purchasePrice * inputs.downPayment / 100)})`
                    : ''
                  }
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Province</label>
                  <select
                    className="w-full border rounded px-3 py-2"
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
                    className="w-full border rounded px-3 py-2"
                    value={inputs.municipality}
                    onChange={(e) => handleInputChange('municipality', e.target.value)}
                  >
                    {(MUNICIPALITIES[inputs.province] || MUNICIPALITIES['default']).map(municipality => (
                      <option key={municipality.value} value={municipality.value}>{municipality.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Property Type</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={inputs.propertyType}
                  onChange={(e) => handleInputChange('propertyType', e.target.value)}
                >
                  {PROPERTY_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
          
          {(activeTab === 'summary') && (
            <div className="p-4 bg-gray-50 rounded">
              <h2 className="text-lg font-semibold mb-4">Mortgage Details</h2>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Interest Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full px-4 py-2 border rounded"
                  value={inputs.interestRate === '' ? '' : inputs.interestRate}
                  onChange={(e) => handleInputChange('interestRate', e.target.value)}
                  onBlur={() => handleBlur('interestRate')}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Amortization</label>
                  <select
                    className="w-full border rounded px-3 py-2"
                    value={inputs.amortizationPeriod}
                    onChange={(e) => handleInputChange('amortizationPeriod', Number(e.target.value))}
                  >
                    {AMORTIZATION_PERIODS.map(period => (
                      <option key={period.value} value={period.value}>{period.label}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Term</label>
                  <select
                    className="w-full border rounded px-3 py-2"
                    value={inputs.term}
                    onChange={(e) => handleInputChange('term', Number(e.target.value))}
                  >
                    {TERM_LENGTHS.map(term => (
                      <option key={term.value} value={term.value}>{term.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Payment Frequency</label>
                <select
                  className="w-full border rounded px-3 py-2"
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
                    className="h-4 w-4 mr-2"
                    checked={inputs.firstTimeBuyer}
                    onChange={(e) => handleInputChange('firstTimeBuyer', e.target.checked)}
                  />
                  <label htmlFor="firstTimeBuyer" className="text-sm">First-time Buyer</label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="newlyBuiltHome"
                    className="h-4 w-4 mr-2"
                    checked={inputs.newlyBuiltHome}
                    onChange={(e) => handleInputChange('newlyBuiltHome', e.target.checked)}
                  />
                  <label htmlFor="newlyBuiltHome" className="text-sm">Newly Built Home</label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="foreignBuyer"
                    className="h-4 w-4 mr-2"
                    checked={inputs.foreignBuyer}
                    onChange={(e) => handleInputChange('foreignBuyer', e.target.checked)}
                  />
                  <label htmlFor="foreignBuyer" className="text-sm">Foreign Buyer</label>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'expenses' && (
            <div className="p-4 bg-gray-50 rounded">
              <h2 className="text-lg font-semibold mb-4">Additional Expenses</h2>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Property Taxes (Annual)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                  <input
                    type="number"
                    className="w-full pl-8 pr-4 py-2 border rounded"
                    value={inputs.propertyTaxes === '' ? '' : inputs.propertyTaxes}
                    onChange={(e) => handleInputChange('propertyTaxes', e.target.value)}
                    onBlur={() => handleBlur('propertyTaxes')}
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Condo Fees (Monthly)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                  <input
                    type="number"
                    className="w-full pl-8 pr-4 py-2 border rounded"
                    value={inputs.condoFees === '' ? '' : inputs.condoFees}
                    onChange={(e) => handleInputChange('condoFees', e.target.value)}
                    onBlur={() => handleBlur('condoFees')}
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Home Insurance (Annual)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                  <input
                    type="number"
                    className="w-full pl-8 pr-4 py-2 border rounded"
                    value={inputs.homeInsurance === '' ? '' : inputs.homeInsurance}
                    onChange={(e) => handleInputChange('homeInsurance', e.target.value)}
                    onBlur={() => handleBlur('homeInsurance')}
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Utilities (Monthly)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                  <input
                    type="number"
                    className="w-full pl-8 pr-4 py-2 border rounded"
                    value={inputs.utilities === '' ? '' : inputs.utilities}
                    onChange={(e) => handleInputChange('utilities', e.target.value)}
                    onBlur={() => handleBlur('utilities')}
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Maintenance (% of home value annually)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">%</span>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full pl-8 pr-4 py-2 border rounded"
                    value={inputs.maintenance === '' ? '' : inputs.maintenance}
                    onChange={(e) => handleInputChange('maintenance', e.target.value)}
                    onBlur={() => handleBlur('maintenance')}
                  />
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'prepayment' && (
            <div className="p-4 bg-gray-50 rounded">
              <h2 className="text-lg font-semibold mb-4">Prepayment Options</h2>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Extra Payment Per Period</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                  <input
                    type="number"
                    className="w-full pl-8 pr-4 py-2 border rounded"
                    value={inputs.extraPayment === '' ? '' : inputs.extraPayment}
                    onChange={(e) => handleInputChange('extraPayment', e.target.value)}
                    onBlur={() => handleBlur('extraPayment')}
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Payment Increase (%)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">%</span>
                  <input
                    type="number"
                    className="w-full pl-8 pr-4 py-2 border rounded"
                    value={inputs.paymentIncrease === '' ? '' : inputs.paymentIncrease}
                    onChange={(e) => handleInputChange('paymentIncrease', e.target.value)}
                    onBlur={() => handleBlur('paymentIncrease')}
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Annual Lump Sum (% of original principal)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">%</span>
                  <input
                    type="number"
                    className="w-full pl-8 pr-4 py-2 border rounded"
                    value={inputs.annualPrepayment === '' ? '' : inputs.annualPrepayment}
                    onChange={(e) => handleInputChange('annualPrepayment', e.target.value)}
                    onBlur={() => handleBlur('annualPrepayment')}
                  />
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'closingCosts' && (
            <div className="p-4 bg-gray-50 rounded">
              <h2 className="text-lg font-semibold mb-4">Closing Cost Options</h2>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Legal Fees</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                  <input
                    type="number"
                    className="w-full pl-8 pr-4 py-2 border rounded"
                    value={inputs.legalFees === '' ? '' : inputs.legalFees}
                    onChange={(e) => handleInputChange('legalFees', e.target.value)}
                    onBlur={() => handleBlur('legalFees')}
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Title Insurance</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                  <input
                    type="number"
                    className="w-full pl-8 pr-4 py-2 border rounded"
                    value={inputs.titleInsurance === '' ? '' : inputs.titleInsurance}
                    onChange={(e) => handleInputChange('titleInsurance', e.target.value)}
                    onBlur={() => handleBlur('titleInsurance')}
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Home Inspection</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                  <input
                    type="number"
                    className="w-full pl-8 pr-4 py-2 border rounded"
                    value={inputs.homeInspection === '' ? '' : inputs.homeInspection}
                    onChange={(e) => handleInputChange('homeInspection', e.target.value)}
                    onBlur={() => handleBlur('homeInspection')}
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Appraisal Fee</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                  <input
                    type="number"
                    className="w-full pl-8 pr-4 py-2 border rounded"
                    value={inputs.appraisalFee === '' ? '' : inputs.appraisalFee}
                    onChange={(e) => handleInputChange('appraisalFee', e.target.value)}
                    onBlur={() => handleBlur('appraisalFee')}
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Brokerage Fee</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                  <input
                    type="number"
                    className="w-full pl-8 pr-4 py-2 border rounded"
                    value={inputs.brokerageFee === '' ? '' : inputs.brokerageFee}
                    onChange={(e) => handleInputChange('brokerageFee', e.target.value)}
                    onBlur={() => handleBlur('brokerageFee')}
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Lender Fee</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                  <input
                    type="number"
                    className="w-full pl-8 pr-4 py-2 border rounded"
                    value={inputs.lenderFee === '' ? '' : inputs.lenderFee}
                    onChange={(e) => handleInputChange('lenderFee', e.target.value)}
                    onBlur={() => handleBlur('lenderFee')}
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Moving Costs</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                  <input
                    type="number"
                    className="w-full pl-8 pr-4 py-2 border rounded"
                    value={inputs.movingCosts === '' ? '' : inputs.movingCosts}
                    onChange={(e) => handleInputChange('movingCosts', e.target.value)}
                    onBlur={() => handleBlur('movingCosts')}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Results section */}
        <div className="lg:col-span-2">
          {activeTab === 'summary' && (
            <div>
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-blue-800 mb-4">Term Summary</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Interest Rate:</span>
                        <span className="font-semibold">{formatPercent(typeof inputs.interestRate === 'number' ? inputs.interestRate : 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Term Length:</span>
                        <span className="font-semibold">{inputs.term} years</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Interest Over Term:</span>
                        <span className="font-semibold">{formatCurrency(results.interestPaidOverTerm)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Balance at End of Term:</span>
                        <span className="font-semibold">{formatCurrency(results.balanceAtEndOfTerm)}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-blue-800 mb-4">Amortization</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Amortization Period:</span>
                        <span className="font-semibold">{inputs.amortizationPeriod} years</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Effective Amortization:</span>
                        <span className="font-semibold">{results.effectiveAmortization.toFixed(2)} years</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Closing Costs:</span>
                        <span className="font-semibold">{formatCurrency(results.closingCosts)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Payment breakdown chart */}
              <div className="bg-white border rounded p-4 mb-6">
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
              
              {/* Calculation Summary */}
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
            </div>
          )}
          
          {activeTab === 'expenses' && (
            <div>
              <div className="bg-white border rounded p-4 mb-6">
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
                      <span className="font-semibold">{formatCurrency((typeof inputs.propertyTaxes === 'number' ? inputs.propertyTaxes : 0) / 12 + (typeof inputs.condoFees === 'number' ? inputs.condoFees : 0))}</span>
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
                        ((typeof inputs.purchasePrice === 'number' ? inputs.purchasePrice : 0) * (typeof inputs.maintenance === 'number' ? inputs.maintenance : 0) / 100) / 12
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
                        <span>{formatCurrency(((typeof inputs.purchasePrice === 'number' ? inputs.purchasePrice : 0) * (typeof inputs.maintenance === 'number' ? inputs.maintenance : 0) / 100) / 12)}</span>
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
            </div>
          )}
          
          {activeTab === 'prepayment' && (
            <div>
              <div className="bg-white border rounded p-4 mb-6">
                <h3 className="text-lg font-semibold mb-4">Prepayment Impact</h3>
                
                <div className="mb-6">
                  <h4 className="font-medium mb-2">Current Prepayment Options</h4>
                  <div className="p-4 bg-gray-50 rounded space-y-2">
                    <div className="flex justify-between">
                      <span>Extra Payment Per Period:</span>
                      <span>{formatCurrency(typeof inputs.extraPayment === 'number' ? inputs.extraPayment : 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Payment Increase:</span>
                      <span>{typeof inputs.paymentIncrease === 'number' ? inputs.paymentIncrease : 0}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Annual Lump Sum:</span>
                      <span>{typeof inputs.annualPrepayment === 'number' ? inputs.annualPrepayment : 0}% of principal</span>
                    </div>
                  </div>
                </div>
                
                <div className="mb-6">
                  <h4 className="font-medium mb-2">Amortization Impact</h4>
                  <div className="p-4 bg-blue-50 rounded space-y-2">
                    <div className="flex justify-between">
                      <span>Original Amortization:</span>
                      <span>{inputs.amortizationPeriod} years</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Effective Amortization:</span>
                      <span>{results.effectiveAmortization.toFixed(2)} years</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Time Saved:</span>
                      <span>{results.timeShaved.toFixed(2)} years</span>
                    </div>
                  </div>
                </div>
                
                <div className="mb-6">
                  <h4 className="font-medium mb-2">Interest Savings</h4>
                  <div className="p-4 bg-green-50 rounded space-y-2">
                    <div className="flex justify-between">
                      <span>Interest Savings Over Term:</span>
                      <span>{formatCurrency(results.interestSavingsOverTerm)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Interest Savings Over Amortization:</span>
                      <span>{formatCurrency(results.interestSavingsOverAmortization)}</span>
                    </div>
                  </div>
                </div>
                
                {/* Balance comparison chart */}
                <div className="mb-6">
                  <h4 className="font-medium mb-2">Mortgage Balance Comparison</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={prepareComparisonData()}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="year" />
                        <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(value) => formatCurrency(value as number)} />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="standardBalance"
                          name="Standard Schedule"
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
            </div>
          )}
          
          {activeTab === 'closingCosts' && (
            <div className="bg-white border rounded p-4">
              <h3 className="text-lg font-semibold mb-4">Closing Costs</h3>
              
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
                  <span>Appraisal Fee</span>
                  <span>{formatCurrency(typeof inputs.appraisalFee === 'number' ? inputs.appraisalFee : 0)}</span>
                </div>
                {typeof inputs.brokerageFee === 'number' && inputs.brokerageFee > 0 && (
                  <div className="flex justify-between">
                    <span>Brokerage Fee</span>
                    <span>{formatCurrency(inputs.brokerageFee)}</span>
                  </div>
                )}
                {typeof inputs.lenderFee === 'number' && inputs.lenderFee > 0 && (
                    <div className="flex justify-between">
                    <span>Lender Fee</span>
                    <span>{formatCurrency(inputs.lenderFee)}</span>
                  </div>
                )}
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
                <div className="flex justify-between font-semibold pt-2 border-t">
                  <span>Total Closing Costs</span>
                  <span>{formatCurrency(results.closingCosts)}</span>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 rounded">
                <h4 className="font-medium mb-2">Land Transfer Tax Calculation</h4>
                <div className="text-sm text-gray-600 space-y-2">
                  <p>The land transfer tax is based on your purchase price of {formatCurrency(typeof inputs.purchasePrice === 'number' ? inputs.purchasePrice : 0)} in {PROVINCES.find(p => p.value === inputs.province)?.label || inputs.province}.</p>
                  
                  {inputs.province === 'ON' && (
                    <div>
                      <p>Ontario Land Transfer Tax calculation:</p>
                      <ul className="list-disc pl-5">
                        <li>0.5% on the first $55,000</li>
                        <li>1.0% on $55,001 to $250,000</li>
                        <li>1.5% on $250,001 to $400,000</li>
                        <li>2.0% on $400,001 to $2,000,000</li>
                        <li>2.5% on amounts over $2,000,000</li>
                      </ul>
                      
                      {(inputs.municipality === 'ottawa' || inputs.municipality === 'none') && (
                        <p className="mt-2">In Ottawa and most other Ontario cities, only the provincial Land Transfer Tax applies (no municipal tax).</p>
                      )}
                      {inputs.firstTimeBuyer && !inputs.foreignBuyer && (
                        <p className="mt-2">As a first-time homebuyer, you receive a rebate of up to $4,000.</p>
                      )}
                      
                      {inputs.municipality === 'toronto' && (
                        <div className="mt-4">
                          <p className="font-medium">Toronto Municipal Land Transfer Tax:</p>
                          <p>In Toronto, you also pay a Municipal Land Transfer Tax in addition to the provincial tax. The rates are:</p>
                          <ul className="list-disc pl-5">
                            <li>0.5% on the first $55,000</li>
                            <li>1.0% on $55,001 to $250,000</li>
                            <li>1.5% on $250,001 to $400,000</li>
                            <li>2.0% on $400,001 to $2,000,000</li>
                            <li>2.5% on amounts over $2,000,000</li>
                          </ul>
                          {inputs.firstTimeBuyer && !inputs.foreignBuyer && (
                            <p className="mt-2">As a first-time homebuyer, you receive a municipal rebate of up to $4,475.</p>
                          )}
                        </div>
                      )}
                      
                      {inputs.foreignBuyer && (
                        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                          <p className="font-medium text-yellow-800">Foreign Buyer Tax (Non-Resident Speculation Tax):</p>
                          <p>As a foreign buyer in Ontario, you are subject to a 25% Non-Resident Speculation Tax (NRST) on the purchase price.</p>
                          <p className="mt-1">Total foreign buyer tax: {formatCurrency((typeof inputs.purchasePrice === 'number' ? inputs.purchasePrice : 0) * 0.25)}</p>
                          <p className="mt-1">Note: Foreign buyers are not eligible for first-time homebuyer rebates.</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {inputs.province === 'BC' && (
                    <div>
                      <p>British Columbia Property Transfer Tax calculation:</p>
                      <ul className="list-disc pl-5">
                        <li>1% on the first $200,000</li>
                        <li>2% on $200,001 to $2,000,000</li>
                        <li>3% on $2,000,001 to $3,000,000</li>
                        <li>5% on amounts over $3,000,000</li>
                      </ul>
                      {inputs.firstTimeBuyer && !inputs.foreignBuyer && (
                        <p className="mt-2">As a first-time homebuyer, you may qualify for a full or partial exemption if the purchase price is below $525,000.</p>
                      )}
                      
                      {inputs.foreignBuyer && (
                        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                          <p className="font-medium text-yellow-800">Foreign Buyer Tax:</p>
                          <p>As a foreign buyer in British Columbia, you are subject to a 20% Foreign Buyers Tax on the purchase price.</p>
                          <p className="mt-1">Total foreign buyer tax: {formatCurrency((typeof inputs.purchasePrice === 'number' ? inputs.purchasePrice : 0) * 0.20)}</p>
                          <p className="mt-1">Note: Foreign buyers are not eligible for first-time homebuyer exemptions.</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {inputs.foreignBuyer && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                      <p className="font-medium text-red-800">Foreign Buyer Additional Requirements:</p>
                      <ul className="list-disc pl-5 text-red-700">
                        <li>Minimum down payment: 35% of the purchase price</li>
                        <li>May be subject to higher interest rates and more stringent qualification criteria</li>
                        <li>Additional documentation may be required for mortgage approval</li>
                        <li>Not eligible for most government homebuyer incentives or rebates</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'amortization' && (
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
      
      <div className="mt-8 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
        <p className="text-sm text-gray-500 max-w-xl">
          Disclaimer: This calculator provides estimates only and should not be considered financial advice. Consult with a mortgage professional for accurate information specific to your situation.
        </p>
        <button 
          onClick={generatePDF}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md flex items-center shadow-md transition-all duration-200 transform hover:scale-105"
        >
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
          </svg>
          Export as PDF
        </button>
      </div>
    </div>
  );
};

export default PurchaseCalculator;
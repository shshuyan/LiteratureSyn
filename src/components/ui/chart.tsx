'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, PieChart, Activity } from 'lucide-react';

interface ChartData {
  label: string;
  value: number;
  color?: string;
}

interface ChartProps {
  data: ChartData[];
  type: 'bar' | 'line' | 'pie' | 'trend';
  title: string;
  className?: string;
}

export function Chart({ data, type, title, className = '' }: ChartProps) {
  const maxValue = Math.max(...data.map(d => d.value));
  
  const getIcon = () => {
    switch (type) {
      case 'bar':
        return <BarChart3 className="h-4 w-4 text-peach" />;
      case 'line':
        return <TrendingUp className="h-4 w-4 text-peach" />;
      case 'pie':
        return <PieChart className="h-4 w-4 text-peach" />;
      case 'trend':
        return <Activity className="h-4 w-4 text-peach" />;
      default:
        return <BarChart3 className="h-4 w-4 text-peach" />;
    }
  };

  const renderBarChart = () => (
    <div className="space-y-3">
      {data.map((item, index) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="space-y-1"
        >
          <div className="flex justify-between items-center text-xs">
            <span className="text-navy/70 dark:text-slate-400">{item.label}</span>
            <span className="text-navy dark:text-slate-200 font-medium">{item.value}</span>
          </div>
          <div className="w-full bg-sand/30 dark:bg-slate-700 rounded-full h-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(item.value / maxValue) * 100}%` }}
              transition={{ duration: 0.8, delay: index * 0.1 }}
              className={`h-2 rounded-full ${item.color || 'bg-peach'}`}
            />
          </div>
        </motion.div>
      ))}
    </div>
  );

  const renderLineChart = () => (
    <div className="relative h-32 bg-white dark:bg-slate-800 rounded border border-sand-200 dark:border-slate-600">
      <svg className="w-full h-full p-4" viewBox="0 0 300 100">
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgb(217, 193, 161)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="rgb(217, 193, 161)" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map(y => (
          <line
            key={y}
            x1="0"
            y1={y}
            x2="300"
            y2={y}
            stroke="currentColor"
            strokeOpacity="0.1"
            strokeWidth="1"
          />
        ))}
        
        {/* Data line */}
        <motion.polyline
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          fill="none"
          stroke="rgb(217, 193, 161)"
          strokeWidth="2"
          points={data.map((item, index) => 
            `${(index / (data.length - 1)) * 300},${100 - (item.value / maxValue) * 80}`
          ).join(' ')}
        />
        
        {/* Data points */}
        {data.map((item, index) => (
          <motion.circle
            key={index}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.1 + 0.5 }}
            cx={(index / (data.length - 1)) * 300}
            cy={100 - (item.value / maxValue) * 80}
            r="3"
            fill="rgb(217, 193, 161)"
          />
        ))}
      </svg>
    </div>
  );

  const renderPieChart = () => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    let currentAngle = 0;
    
    return (
      <div className="flex items-center gap-6">
        <div className="relative w-24 h-24">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            {data.map((item, index) => {
              const percentage = (item.value / total) * 100;
              const angle = (percentage / 100) * 360;
              const startAngle = currentAngle;
              currentAngle += angle;
              
              const x1 = 50 + 40 * Math.cos((startAngle * Math.PI) / 180);
              const y1 = 50 + 40 * Math.sin((startAngle * Math.PI) / 180);
              const x2 = 50 + 40 * Math.cos(((startAngle + angle) * Math.PI) / 180);
              const y2 = 50 + 40 * Math.sin(((startAngle + angle) * Math.PI) / 180);
              
              const largeArcFlag = angle > 180 ? 1 : 0;
              
              return (
                <motion.path
                  key={index}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                  fill={item.color || `hsl(${index * 60}, 50%, 60%)`}
                  opacity="0.8"
                />
              );
            })}
          </svg>
        </div>
        
        <div className="space-y-2">
          {data.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-2 text-xs"
            >
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color || `hsl(${index * 60}, 50%, 60%)` }}
              />
              <span className="text-navy/70 dark:text-slate-400">{item.label}</span>
              <span className="text-navy dark:text-slate-200 font-medium">
                {((item.value / total) * 100).toFixed(1)}%
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    );
  };

  const renderChart = () => {
    switch (type) {
      case 'bar':
        return renderBarChart();
      case 'line':
      case 'trend':
        return renderLineChart();
      case 'pie':
        return renderPieChart();
      default:
        return renderBarChart();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-sand/20 dark:bg-slate-700/30 rounded-lg p-4 ${className}`}
    >
      <div className="flex items-center gap-2 mb-4">
        {getIcon()}
        <h4 className="text-sm font-medium text-navy dark:text-slate-100">
          {title}
        </h4>
      </div>
      
      {data.length > 0 ? (
        renderChart()
      ) : (
        <div className="h-32 flex items-center justify-center text-center">
          <div>
            <BarChart3 className="h-8 w-8 text-navy/30 dark:text-slate-500 mx-auto mb-2" />
            <p className="text-xs text-navy/50 dark:text-slate-400">
              No data available
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Sample data generator for demonstration
export function generateSampleChartData(type: 'moa' | 'safety' | 'kol'): ChartData[] {
  switch (type) {
    case 'moa':
      return [
        { label: 'Receptor Binding', value: 85, color: 'bg-blue-500' },
        { label: 'Signal Transduction', value: 72, color: 'bg-green-500' },
        { label: 'Gene Expression', value: 68, color: 'bg-purple-500' },
        { label: 'Protein Synthesis', value: 45, color: 'bg-orange-500' },
      ];
    case 'safety':
      return [
        { label: 'Mild AEs', value: 65, color: 'bg-green-500' },
        { label: 'Moderate AEs', value: 28, color: 'bg-yellow-500' },
        { label: 'Severe AEs', value: 7, color: 'bg-red-500' },
      ];
    case 'kol':
      return [
        { label: 'Positive', value: 58, color: 'bg-green-500' },
        { label: 'Neutral', value: 32, color: 'bg-gray-500' },
        { label: 'Negative', value: 10, color: 'bg-red-500' },
      ];
    default:
      return [];
  }
}
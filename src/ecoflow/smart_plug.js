import React, { useState, useEffect } from 'react';
import '../App.css';
import axios from 'axios'; // Import axios for data fetching
import DataTable from 'react-data-table-component'; // Import DataTable component
import Select from 'react-select'; // Import react-select for the dropdown
import ApexCharts from 'react-apexcharts'; // Import ApexCharts
import { ClipLoader } from 'react-spinners'; // Import the spinner
import 'bootstrap/dist/css/bootstrap.min.css';

// Import React Bootstrap components
import { Card, Container, Row, Col, Spinner, Button } from 'react-bootstrap';


const SmartPlugData = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('hourly'); // Default period is hourly
  console.log(data);

  // Function to format the period based on the selected period type
  const formatPeriod = (timestamp, periodType) => {
    const date = new Date(timestamp); // Directly use the timestamp without any time zone conversion
    const options = { year: '2-digit', month: 'short', day: 'numeric' };

    switch (periodType) {
      case 'minute':
        options.hour = '2-digit';
        options.minute = '2-digit';
        break;
      case 'hourly':
        options.hour = '2-digit';
        break;
      case 'weekly':
        // Format as week number
        const weekNumber = Math.ceil(
          (date - new Date(date.getFullYear(), 0, 1)) / 604800000
        );
        return `${new Intl.DateTimeFormat('en-GB', options).format(date)} (Week ${weekNumber})`;
      case 'monthly':
        options.month = 'short';
        options.year = '2-digit';
        delete options.day;
        break;
      case 'annual':
        options.year = 'numeric';
        delete options.month;
        delete options.day;
        break;
      default:
        break;
    }

    return new Intl.DateTimeFormat('en-GB', options).format(date);
  };

  // Define columns for DataTable
  const columns = [
    { name: 'Index', selector: row => row.index, sortable: true },
    { name: 'Period', selector: row => row.period, sortable: true },
    { name: 'Average Volt', selector: row => row.averageVolt.toFixed(2), sortable: true },
    { name: 'Average Current', selector: row => row.averageCurrent.toFixed(2), sortable: true },
    { name: 'Average Watts', selector: row => row.averageWatts.toFixed(2), sortable: true },
    { name: 'Max Watts', selector: row => row.maxWatts, sortable: true },
    { name: 'Min Watts', selector: row => row.minWatts, sortable: true },
    { name: 'Total Count', selector: row => row.totalCount, sortable: true },
    { name: 'Total Watt-Hours', selector: row => row.totalWattHours.toFixed(2), sortable: true }
  ];

  // Function to fetch data from the server for the specified endpoint
  const fetchData = async (endpoint) => {
    try {
      setLoading(true); // Show spinner while loading
      const response = await axios.get(`http://localhost:5000/smart-plug/${endpoint}`);
      const formattedData = response.data.map(item => ({
        ...item,
        period: formatPeriod(item.period, period) // Format the period based on the selected period
      }));
      setData(formattedData); // Set the response data into state
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false); // Hide spinner after data is loaded
    }
  };

  useEffect(() => {
    fetchData(period); // Fetch data based on the selected period

    // Set up polling interval to fetch data every 30 seconds (or change the interval as needed)
    const intervalId = setInterval(() => {
      fetchData(period); // Refetch data at regular intervals
    }, 30000); // 30 seconds interval

    // Cleanup function to clear the interval when the component is unmounted or period changes
    return () => clearInterval(intervalId);

  }, [period]); // Dependency on `period` to refetch when it changes

  // Calculate total watt-hours dynamically
  const totalWattHours = data.reduce((total, item) => total + item.totalWattHours, 0).toFixed(2);

  // Chart data processing logic (updated to plot Total Watt-Hours)
  const chartData = {
    series: [{
      name: "Total Watt-Hours",
      data: data.map(item => parseFloat(item.totalWattHours.toFixed(2))) // Round data to two decimal places
    }],
    options: {
      chart: {
        id: 'smart-plug-chart',
        toolbar: {
          show: true, // Show zoom and pan toolbar controls
          tools: {
            zoomin: true,
            zoomout: true,
            reset: true // Add reset button for zoom
          }
        },
      },
      zoom: {
        enabled: true, // Enable zoom
        type: 'xy', // Allow zoom in both X and Y directions
        autoScaleYaxis: true, // Auto scale Y-axis when zooming
      },
      pan: {
        enabled: true, // Enable pan
        type: 'xy', // Allow panning in both X and Y directions
        modifierKey: 'shift', // Panning with shift key pressed
        mouseWheel: {
          enabled: true, // Enable mouse wheel panning
        }
      },
      xaxis: {
        categories: data.map(item => item.period), // Assuming 'period' is a timestamp or identifier
        title: {
          text: 'Time Period'
        },
        labels: {
          formatter: (value) => value // Format X-axis labels based on the period
        }
      },
      yaxis: {
        title: {
          text: 'Total Watt-Hours'
        },
        labels: {
          formatter: (value) => value.toFixed(2) // Format Y-axis values to two decimal places
        }
      },
      title: {
        text: `Total Watt-Hours - ${period.charAt(0).toUpperCase() + period.slice(1)}`,
        align: 'center'
      },
      plotOptions: {
        bar: {
          horizontal: false, // Vertical bars, set true for horizontal bars
          columnWidth: '50%' // Set the width of the bars
        }
      },
      tooltip: {
        y: {
          formatter: (val) => val.toFixed(2) // Format tooltip data to two decimal places
        }
      },
      // Conditionally change the chart type based on the selected period
      chart: {
        type: period === 'minute' ? 'line' : 'bar', // Switch to line chart if period is 'minute'
      },
      stroke: {
        width: period === 'minute' ? 2 : 0, // Set line width for the line chart
        curve: 'smooth', // Smooth line for the line chart
      },
    }
  };

  // Rendering logic
  return (
    <div className="data-container">
      {loading ? (
        // Display spinner while loading
        <div className="loading-container">
          <Spinner animation="border" role="status" variant="primary" />
          <p>Loading data...</p>
        </div>
      ) : (
        <>
          <h1>Smart Plug Data</h1>

          {/* Dropdown to select the period */}
          <div>
            <label htmlFor="period-select">Select Period:</label>
            <select
              id="period-select"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option value="minute">Minute</option>
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option> {/* Added Monthly */}
              <option value="annual">Yearly</option> {/* Added Yearly */}
            </select>
          </div>

          <h2>{period.charAt(0).toUpperCase() + period.slice(1)} Data</h2>

          {/* React Bootstrap Card for Total Watt-Hours */}
          <Container>
            <Row className="justify-content-center">
              <Col xs={12} md={4}>
                <Card  border="primary" style={{ width: '18rem' }}>
                <Card.Header className="bg-info text-dark">Energy</Card.Header>
                  <Card.Body>
                    <Card.Title className="text-center">Total Watt-Hours</Card.Title>
                    <Card.Text className="text-center" style={{ fontSize: '2rem' }}>
                      {totalWattHours} Wh
                    </Card.Text>
                  </Card.Body>
                  <Card.Footer>
                    <small className="text-muted">Last updated a minute ago</small>
                  </Card.Footer>
                </Card>
              </Col>
            </Row>
          </Container>

          {/* ApexCharts Component */}
          <div style={{ width: '100%', height: '400px' }}>
            <ApexCharts
              options={chartData.options}
              series={chartData.series}
              type={chartData.options.chart.type} // Dynamically switch chart type
              height={350}
            />
          </div>

          {/* DataTable Component */}
          <DataTable
            columns={columns} // Show all columns
            data={data}
            pagination // Enable pagination
            highlightOnHover // Enable row highlight on hover
            striped // Optional: Striped rows for better readability
            responsive // Make the table responsive
          />
        </>
      )}
    </div>
  );
};

export default SmartPlugData;

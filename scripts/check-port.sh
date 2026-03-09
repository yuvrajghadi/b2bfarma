#!/bin/bash
# ====================================
# Port Management Scripts for macOS/Linux
# ====================================

PORT=${1:-3000}

echo "Checking port $PORT..."

# Find process using the port
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Port $PORT is in use!"
    
    # Get PID
    PID=$(lsof -Pi :$PORT -sTCP:LISTEN -t)
    echo "Process ID: $PID"
    
    # Show process details
    ps -p $PID -o comm=,pid=,user=
    
    # Ask to kill
    read -p "Do you want to kill this process? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kill -9 $PID
        echo "✅ Process killed successfully!"
    else
        echo "Process not killed. Change PORT in .env"
    fi
else
    echo "✅ Port $PORT is available!"
fi

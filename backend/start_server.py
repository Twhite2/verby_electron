"""
VerbyFlow Backend Server Launcher

This script starts the FastAPI server for the VerbyFlow application.
"""
import uvicorn
import os
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger("verbyflow-server")

if __name__ == "__main__":
    # Get port from environment or use default
    port = int(os.getenv("PORT", 8000))
    
    # Log server start
    logger.info(f"Starting VerbyFlow Backend Server on port {port}")
    
    # Run the server with hot reload for development
    uvicorn.run(
        "main:app", 
        host="0.0.0.0", 
        port=port, 
        reload=True,
        log_level="info"
    )

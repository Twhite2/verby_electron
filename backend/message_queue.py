"""
Message queue implementation for handling asynchronous message processing
Used for bi-directional conversation handling in VerbyFlow
"""

import asyncio
from typing import List, Dict, Any, Optional, Callable, Coroutine
from collections import deque
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("verbyflow.queue")

class MessageQueue:
    """
    A queue implementation for asynchronous message processing
    Supports bi-directional conversation by managing pending messages
    """
    def __init__(self, max_size: int = 100):
        self.queue = deque(maxlen=max_size)
        self._processing = False
        self._lock = asyncio.Lock()
        self._processors: List[Callable[[Any], Coroutine[Any, Any, None]]] = []
        self._task: Optional[asyncio.Task] = None
    
    def add_processor(self, processor: Callable[[Any], Coroutine[Any, Any, None]]):
        """
        Add a message processor function
        The processor will be called for each message in the queue
        """
        self._processors.append(processor)
    
    def size(self) -> int:
        """Return the current queue size"""
        return len(self.queue)
    
    def is_empty(self) -> bool:
        """Check if the queue is empty"""
        return len(self.queue) == 0
    
    def clear(self):
        """Clear the queue"""
        self.queue.clear()
    
    def add_message(self, message: Any):
        """Add a message to the queue"""
        self.queue.append(message)
        logger.debug(f"Message added to queue. Queue size: {len(self.queue)}")
        
        # Start processing if not already running
        if not self._processing and not self._task:
            self._task = asyncio.create_task(self._process_queue())
    
    async def _process_queue(self):
        """Process messages in the queue"""
        self._processing = True
        
        try:
            while len(self.queue) > 0:
                async with self._lock:
                    # Get the next message
                    if len(self.queue) > 0:
                        message = self.queue.popleft()
                    else:
                        break
                
                # Process the message with all registered processors
                for processor in self._processors:
                    try:
                        await processor(message)
                    except Exception as e:
                        logger.error(f"Error processing message: {str(e)}")
                
                # Small delay to prevent CPU hogging
                await asyncio.sleep(0.01)
                
        except Exception as e:
            logger.error(f"Error in message queue processing: {str(e)}")
        finally:
            self._processing = False
            self._task = None
    
    async def stop(self):
        """Stop queue processing"""
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        self._processing = False
        self._task = None

class ClientMessageManager:
    """
    Manages message queues for multiple clients
    Each client (identified by a unique ID) gets its own message queue
    """
    def __init__(self):
        self.queues: Dict[str, MessageQueue] = {}
    
    def get_queue(self, client_id: str) -> MessageQueue:
        """Get or create a queue for a client"""
        if client_id not in self.queues:
            self.queues[client_id] = MessageQueue()
        return self.queues[client_id]
    
    def add_message(self, client_id: str, message: Any):
        """Add a message to a client's queue"""
        queue = self.get_queue(client_id)
        queue.add_message(message)
    
    def add_processor(self, client_id: str, processor: Callable[[Any], Coroutine[Any, Any, None]]):
        """Add a processor to a client's queue"""
        queue = self.get_queue(client_id)
        queue.add_processor(processor)
    
    def remove_client(self, client_id: str):
        """Remove a client's queue"""
        if client_id in self.queues:
            asyncio.create_task(self.queues[client_id].stop())
            del self.queues[client_id]
    
    async def stop_all(self):
        """Stop all queues"""
        for client_id, queue in list(self.queues.items()):
            await queue.stop()
            del self.queues[client_id]

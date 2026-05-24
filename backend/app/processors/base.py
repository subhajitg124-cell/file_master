from abc import ABC, abstractmethod
from typing import Callable, Optional

class BaseProcessor(ABC):
    """
    Abstract base class for all file processor plugins.
    Each handler must implement validate_options and process.
    """
    
    @abstractmethod
    def validate_options(self, options: dict) -> None:
        """
        Validates the configuration options provided for this operation.
        Raises ValueError if options are invalid.
        """
        pass

    @abstractmethod
    def process(
        self, 
        file_paths: list[str], 
        options: dict, 
        progress_callback: Optional[Callable[[float], None]] = None
    ) -> str:
        """
        Executes the file manipulation.
        
        Args:
            file_paths: List of local paths to input files.
            options: Configuration options.
            progress_callback: Optional function that takes a float (0.0 to 100.0) 
                              to report current task completion.
                              
        Returns:
            The local file path to the completed output file.
        """
        pass


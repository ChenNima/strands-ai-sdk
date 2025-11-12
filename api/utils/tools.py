import requests
import json
from strands import tool


@tool
def get_current_weather(latitude: float, longitude: float) -> dict:
    """Get the current weather at a location.
    
    Args:
        latitude: The latitude of the location
        longitude: The longitude of the location
    
    Returns:
        Weather information including temperature and forecast
    """
    # Format the URL with proper parameter substitution
    url = f"https://api.open-meteo.com/v1/forecast?latitude={latitude}&longitude={longitude}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto"

    try:
        # Make the API call
        response = requests.get(url)

        # Raise an exception for bad status codes
        response.raise_for_status()

        # Return in Strands format
        weather_data = response.json()
        return {
            "status": "success",
            "content": [{"text": json.dumps(weather_data, ensure_ascii=False)}]
        }

    except requests.RequestException as e:
        # Handle any errors that occur during the request
        return {
            "status": "error",
            "content": [{"text": f"Error fetching weather data: {e}"}]
        }


# Export the tool for use with Agent
STRANDS_TOOLS = [get_current_weather]

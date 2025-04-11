
def balanceToSize(balance):	
	rangeMin = 8
	rangeMax = 20
	size = rangeMin + (balance - 10000) * (rangeMax - rangeMin) / (100000 - 10000)
	return max(rangeMin, min(rangeMax, size))

def balanceToViewport(balance):
	rangeMin = 250
	rangeMax = 350
	viewport = rangeMin + (balance - 10000) * (rangeMax - rangeMin) / (100000 - 10000)
	return max(rangeMin, min(rangeMax, viewport))

def balanceToSpeed(balance):
	rangeMin = 70
	rangeMax = 120
	speed = rangeMin + (balance - 10000) * (rangeMax - rangeMin) / (100000 - 10000)
	return max(rangeMin, min(rangeMax, speed))

def getColorById(id):
	return [random.random(), random.random(), random.random()]


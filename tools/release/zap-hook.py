# The preview deliberately has no direct link to /embed. Seed public GET entry points.
def zap_started(zap, target):
    for path in ('/preview?lang=en', '/embed?lang=de', '/compass-widget.js', '/api/project-submission'):
        zap.urlopen(target.rstrip('/') + path)

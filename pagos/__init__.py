"""Module initialization for the pagos package.

This file marks the ``pagos`` directory as a proper Python package, so that
it can be imported using dotted notation (e.g. ``pagos.app``).

By re-exporting the Flask application instance from :mod:`pagos.app` as
``app``, we make it straightforward for WSGI servers like Gunicorn to
discover the application when specifying ``pagos`` as the module.
"""

from .app import app  # noqa: F401  re-export the Flask app

__all__ = ["app"]
__all__ = ["app"]

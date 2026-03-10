# Changelog

All notable changes to the Vietnam Address Woocommerce plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned

- Multi-currency support
- Advanced shipping rate calculator
- Integration with popular shipping providers
- Custom field builder
- Import/Export settings

## [1.0.0] - 2026-02-25

### Added

- 🎉 Initial release of Vietnam Address Woocommerce
- Province/City dropdown with 63 provinces of Vietnam
- District dropdown dynamically loaded based on selected province
- Ward/Commune dropdown dynamically loaded based on selected district
- Modern React-based UI components with TypeScript
- Address data from official Vietnam General Statistics Office
- Phone number field for shipping recipient
- Phone number display in order admin and emails
- Convert "First name & Last name" to "Họ và tên" (Vietnamese full name)
- Reorder checkout fields to match Vietnamese address format
- Move detailed address field to bottom (after province/district/ward selection)
- Currency symbol conversion from ₫ to VNĐ
- PayPal support with custom VND exchange rate
- Shipping cost calculation by province/city
- No database required - all data stored as arrays for better performance
- Hide unnecessary checkout fields
- Flexible settings panel in WordPress admin
- Multi-language support (Vietnamese, English)
- Mobile responsive design
- Compatible with Woo 8.0+
- Compatible with WordPress 5.0+
- PHP 7.4+ support

### Technical

- Built with React 18 and TypeScript
- Vite for fast build and development
- Modern JavaScript (ES2020+)
- Clean, maintainable codebase
- Automated build system with GitHub Actions
- Comprehensive build script for distribution

### Documentation

- Complete readme.txt for WordPress.org
- GitHub README.md with installation guide
- Release documentation (RELEASE.md)
- Code comments and inline documentation
- FAQ section

### Developer Features

- WordPress hooks and filters for customization
- Clean API for extending functionality
- TypeScript type definitions
- Modular component structure
- Easy to fork and customize

---

## Version History Summary

- **1.0.0** - Initial public release

---

## Upgrade Notice

### 1.0.0

First version of the plugin. Install now to optimize checkout experience for your Vietnamese Woo store!

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to contribute to this project.

## Support

If you encounter any issues or have questions:

- Check the [FAQ section](README.md#-faq)
- Search [existing issues](https://github.com/coolbirdzik/vietnam-address-woo/issues)
- Create a [new issue](https://github.com/coolbirdzik/vietnam-address-woo/issues/new) if needed

## Links

- [GitHub Repository](https://github.com/coolbirdzik/vietnam-address-woo)
- [WordPress.org Plugin Page](https://wordpress.org/plugins/vietnam-checkout-for-woocommerce/)
- [Documentation](README.md)

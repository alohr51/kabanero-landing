echo "Installing ruby packages..."
# only install the latest 1.x version of bundler. We had problems with 2.x
# the problems might be fixes in later bundler versions so we can try again later
gem install bundler -v "~>1.0"
bundle install
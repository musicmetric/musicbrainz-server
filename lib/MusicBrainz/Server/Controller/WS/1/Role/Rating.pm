package MusicBrainz::Server::Controller::WS::1::Role::Rating;
use Moose::Role;

before 'lookup' => sub {
    my ($self, $c) = @_;

    return unless $c->stash->{inc}->ratings || $c->stash->{inc}->user_ratings;
    $c->authenticate({}, 'musicbrainz.org') if !$c->user_exists && $c->stash->{inc}->user_ratings;

    my $entity = $c->stash->{entity};
    my $model = $self->model;

    if ($c->stash->{inc}->ratings) {
        $c->model($model)->load_meta($entity);
    }

    if ($c->stash->{inc}->user_ratings) {
        $c->model($model)->rating->load_user_ratings($c->user->id, $entity);
    }
};

1;
